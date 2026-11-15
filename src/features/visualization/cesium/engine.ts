"use client";
/**
 * CesiumJS renderer for the visualization globe.
 * No Cesium ion services, geocoder, terrain or access token: the basemap is an
 * explicitly configured NASA GIBS WMTS layer over a plain ellipsoid, with the
 * existing local NASA image as the labelled degraded/offline fallback.
 */
// The pinned cesium package's unbundled Source imports a Gaussian-splat WASM
// module that the Next.js bundler cannot emit, and its pre-bundled ESM build
// uses `import.meta` in a .js file webpack treats as a script. The official
// single-file bundle is therefore copied into public/cesium by
// scripts/copy-cesium-assets.mjs and loaded at runtime as a native ES module.
import type * as CesiumTypes from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { SpatialField } from "../model";
import type { MapPoint } from "../Globe";
import { fieldRectangle, fieldToRgba, type RasterRect } from "../fieldRaster";
import type { ExtentBox } from "../extents";
import type { FieldStyle } from "../styles";

export const GIBS_TILE_URL =
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpeg";
export const GIBS_MATRIX_SET = "GoogleMapsCompatible_Level8";
export const GIBS_MAX_LEVEL = 8;
export const GIBS_CREDIT = "NASA EOSDIS GIBS / Blue Marble Shaded Relief & Bathymetry (MODIS)";
export const LOCAL_BASEMAP_URL = "/visualization/basemap-2048x1024.jpg";
export const BASEMAP_RESOLUTION_NOTE = "Tiled MODIS imagery up to ~500 m/px at the equator — a zoomed globe cannot show street-level detail.";

export type BasemapMode = "tiled" | "local";
export interface EngineState {
    engine: "loading" | "ready" | "failed";
    basemap: "tiles-loading" | "tiles-ready" | "tiles-degraded" | "local";
    tileFailures: number;
    lastTileError?: string;
}
export interface EngineOptions {
    onPick(lat: number, lon: number): void;
    onStatus(state: EngineState): void;
    reducedMotion: boolean;
}

type CesiumNS = typeof CesiumTypes;
let Cesium!: CesiumNS;
const CESIUM_MODULE_URL = "/cesium/index.js";
const FAILURE_DEGRADE_THRESHOLD = 8;

function gibsProvider(): CesiumTypes.WebMapTileServiceImageryProvider {
    return new Cesium.WebMapTileServiceImageryProvider({
        url: GIBS_TILE_URL,
        layer: "BlueMarble_ShadedRelief_Bathymetry",
        style: "default",
        tileMatrixSetID: GIBS_MATRIX_SET,
        tileMatrixLabels: Array.from({ length: GIBS_MAX_LEVEL + 1 }, (_, i) => String(i)),
        format: "image/jpeg",
        tileWidth: 256,
        tileHeight: 256,
        minimumLevel: 0,
        maximumLevel: GIBS_MAX_LEVEL,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: GIBS_CREDIT,
        enablePickFeatures: false,
    });
}

function localProvider(): CesiumTypes.SingleTileImageryProvider {
    return new Cesium.SingleTileImageryProvider({
        url: LOCAL_BASEMAP_URL,
        rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
        credit: "NASA Visible Earth / Blue Marble — local degraded basemap",
    });
}

export class GlobeEngine {
    private viewer: CesiumTypes.Viewer;
    private handler: CesiumTypes.ScreenSpaceEventHandler;
    private opts: EngineOptions;
    private basemapLayer: CesiumTypes.ImageryLayer | null = null;
    private fieldLayer: CesiumTypes.ImageryLayer | null = null;
    private fieldAlpha = 0.93;
    private points: CesiumTypes.PointPrimitiveCollection;
    private extentEntity: CesiumTypes.Entity | null = null;
    private cellEntity: CesiumTypes.Entity | null = null;
    private progressListener: CesiumTypes.Event.RemoveCallback;
    private tileFailures = 0;
    private degraded = false;
    private disposed = false;

    static async create(container: HTMLElement, opts: EngineOptions): Promise<GlobeEngine> {
        (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
        Cesium = (await import(/* webpackIgnore: true */ CESIUM_MODULE_URL)) as CesiumNS;
        // Viewer creation may throw when WebGL2 is unavailable — callers
        // convert that to the accessible 2D map.
        return new GlobeEngine(container, opts);
    }

    private constructor(container: HTMLElement, opts: EngineOptions) {
        this.opts = opts;
        const provider = gibsProvider();
        provider.errorEvent.addEventListener(e => this.onTileFailure(e));
        const baseLayer = new Cesium.ImageryLayer(provider, { alpha: 1 });
        this.basemapLayer = baseLayer;
        this.viewer = new Cesium.Viewer(container, {
            baseLayer,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            infoBox: false,
            selectionIndicator: false,
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            requestRenderMode: true,
            maximumRenderTimeChange: Infinity,
            contextOptions: { webgl: { failIfMajorPerformanceCaveat: false } },
        });
        const scene = this.viewer.scene;
        scene.globe.baseColor = Cesium.Color.fromCssColorString("#13222e");
        scene.globe.tileCacheSize = 120;
        const controls = scene.screenSpaceCameraController;
        controls.enableTilt = true;
        controls.minimumZoomDistance = 280000;
        controls.maximumZoomDistance = 55000000;
        this.viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(50, 15, 2.2e7) });
        this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
        this.handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        this.handler.setInputAction((event: CesiumTypes.ScreenSpaceEventHandler.PositionedEvent) => {
            const cartesian = this.viewer.camera.pickEllipsoid(event.position, scene.globe.ellipsoid);
            if (!cartesian) return;
            const c = Cesium.Cartographic.fromCartesian(cartesian);
            this.opts.onPick(Cesium.Math.toDegrees(c.latitude), Cesium.Math.toDegrees(c.longitude));
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.progressListener = scene.globe.tileLoadProgressEvent.addEventListener(() => this.emitStatus());
        this.viewer.resize();
        this.render();
        this.emitStatus();
    }

    resize() {
        if (this.disposed) return;
        this.viewer.resize();
        this.render();
    }

    private lastTileError = "";

    private emitStatus() {
        this.opts.onStatus({
            engine: "ready",
            basemap: this.degraded ? "tiles-degraded" : this.basemapMode() === "local" ? "local" : "tiles-ready",
            tileFailures: this.tileFailures,
            lastTileError: this.lastTileError,
        });
    }

    private render() {
        if (!this.disposed) this.viewer.scene.requestRender();
    }

    private onTileFailure(error?: CesiumTypes.TileProviderError) {
        // Camera moves cancel in-flight requests; a cancellation is not a
        // failed tile and must not trip the degraded-fallback counter.
        const message = String((error?.error as Error | undefined)?.message ?? error?.message ?? "");
        if (message.includes("Request cancelled")) return;
        this.tileFailures += 1;
        this.lastTileError = message || "unknown tile error";
        if (!this.degraded && this.tileFailures >= FAILURE_DEGRADE_THRESHOLD)
            this.setBasemap("local", true);
        this.emitStatus();
    }

    basemapMode(): BasemapMode {
        return this.basemapLayer?.imageryProvider instanceof Cesium.SingleTileImageryProvider ? "local" : "tiled";
    }

    /** Swap basemap imagery. `degraded` marks an automatic fallback after tile failures. */
    setBasemap(mode: BasemapMode, degraded = false) {
        if (this.basemapLayer) {
            const alpha = this.basemapLayer.alpha;
            this.viewer.imageryLayers.remove(this.basemapLayer, true);
            const provider = mode === "tiled" ? gibsProvider() : localProvider();
            if (mode === "tiled") {
                provider.errorEvent.addEventListener(e => this.onTileFailure(e));
                this.tileFailures = 0;
            }
            this.basemapLayer = this.viewer.imageryLayers.addImageryProvider(provider, 0);
            this.basemapLayer.alpha = alpha;
        }
        this.degraded = degraded;
        this.emitStatus();
        this.render();
    }

    setBasemapAlpha(alpha: number) {
        if (this.basemapLayer) this.basemapLayer.alpha = alpha;
        this.render();
    }

    setBasemapVisible(visible: boolean) {
        if (this.basemapLayer) this.basemapLayer.show = visible;
        this.render();
    }

    setFieldAlpha(alpha: number) {
        this.fieldAlpha = alpha;
        if (this.fieldLayer) this.fieldLayer.alpha = alpha;
        this.render();
    }

    setFieldVisible(visible: boolean) {
        if (this.fieldLayer) this.fieldLayer.show = visible;
        this.render();
    }

    /** Whether the basemap imagery draws above the field imagery. */
    setFieldUnderBasemap(under: boolean) {
        if (!this.fieldLayer || !this.basemapLayer) return;
        if (under) this.viewer.imageryLayers.lowerToBottom(this.fieldLayer);
        else this.viewer.imageryLayers.raiseToTop(this.fieldLayer);
        this.render();
    }

    setPointsVisible(visible: boolean) {
        this.points.show = visible;
        this.render();
    }

    setExtentVisible(visible: boolean) {
        if (this.extentEntity) this.extentEntity.show = visible;
        this.render();
    }

    private fieldStyle: FieldStyle | undefined;

    /** Replace the numeric field layer. One image pixel per output cell; NEAREST keeps true cell structure. */
    setField(field: SpatialField | null, opts: { alpha: number; visible: boolean; style?: FieldStyle }) {
        this.fieldAlpha = opts.alpha;
        this.fieldStyle = opts.style;
        if (this.fieldLayer) {
            this.viewer.imageryLayers.remove(this.fieldLayer, true);
            this.fieldLayer = null;
        }
        if (field) {
            const { width, height, data } = fieldToRgba(field, 1, this.fieldStyle);
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d")?.putImageData(new ImageData(data, width, height), 0, 0);
            const rect = fieldRectangle(field);
            const provider = new Cesium.SingleTileImageryProvider({
                url: canvas.toDataURL("image/png"),
                tileWidth: width,
                tileHeight: height,
                rectangle: Cesium.Rectangle.fromDegrees(rect.west, rect.south, rect.east, rect.north),
                credit: `${field.field} ${field.month} — numeric source raster, not basemap imagery`,
            });
            this.fieldLayer = this.viewer.imageryLayers.addImageryProvider(provider, 1);
            this.fieldLayer.alpha = opts.alpha;
            this.fieldLayer.show = opts.visible;
            this.fieldLayer.magnificationFilter = Cesium.TextureMagnificationFilter.NEAREST;
            this.fieldLayer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR;
        }
        this.render();
    }

    setPoints(points: MapPoint[]) {
        this.points.removeAll();
        for (const point of points) {
            this.points.add({
                position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat),
                pixelSize: 10,
                color: Cesium.Color.fromCssColorString(point.color),
                outlineColor: Cesium.Color.BLACK.withAlpha(0.8),
                outlineWidth: 1.5,
            });
        }
        this.render();
    }

    private setRectangle(entity: CesiumTypes.Entity | null, rect: RasterRect | null, color: CesiumTypes.Color): CesiumTypes.Entity | null {
        if (entity) this.viewer.entities.remove(entity);
        if (!rect) return null;
        return this.viewer.entities.add({
            rectangle: {
                coordinates: Cesium.Rectangle.fromDegrees(rect.west, rect.south, rect.east, rect.north),
                fill: false,
                outline: true,
                outlineColor: color,
                outlineWidth: 2,
            },
        });
    }

    /** Outline of the requested extent; skipped for a degenerate ±180° box. */
    setExtentOutline(box: ExtentBox | null) {
        const rect = box && box[3] - box[2] < 359.9
            ? { west: box[2], south: box[0], east: box[3], north: box[1] }
            : null;
        this.extentEntity = this.setRectangle(this.extentEntity, rect, Cesium.Color.WHITE.withAlpha(0.65));
        this.render();
    }

    /** Footprint outline of the inspected output cell. */
    selectCell(rect: RasterRect | null) {
        this.cellEntity = this.setRectangle(this.cellEntity, rect, Cesium.Color.fromCssColorString("#ffe08a"));
        this.render();
    }

    frame(box: ExtentBox) {
        const rect = Cesium.Rectangle.fromDegrees(box[2], box[0], box[3], box[1]);
        if (this.opts.reducedMotion) this.viewer.camera.setView({ destination: rect });
        else this.viewer.camera.flyTo({ destination: rect, duration: 1.1 });
    }

    focus(lat: number, lon: number) {
        const destination = Cesium.Cartesian3.fromDegrees(lon, lat, 4.2e6);
        const orientation = { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 };
        if (this.opts.reducedMotion) this.viewer.camera.setView({ destination, orientation });
        else this.viewer.camera.flyTo({ destination, orientation, duration: 1.0 });
    }

    nudge(action: string) {
        const camera = this.viewer.camera;
        const height = camera.positionCartographic.height;
        if (action === "reset") {
            const home = Cesium.Cartesian3.fromDegrees(50, 15, 2.2e7);
            if (this.opts.reducedMotion) camera.setView({ destination: home });
            else camera.flyTo({ destination: home, duration: 1.0 });
        } else if (action === "in" || action === "out") {
            const step = Math.max(60000, height * 0.3);
            if (action === "in") camera.zoomIn(step);
            else camera.zoomOut(step);
        } else {
            if (action === "east" || action === "west")
                camera.rotate(Cesium.Cartesian3.UNIT_Z, action === "east" ? -0.22 : 0.22);
            else {
                const lat = Cesium.Math.toDegrees(camera.positionCartographic.latitude);
                if ((action === "north" && lat < 82) || (action === "south" && lat > -82))
                    camera.rotate(camera.right, action === "north" ? 0.16 : -0.16);
            }
        }
        this.render();
    }

    dispose() {
        this.disposed = true;
        this.progressListener();
        this.handler.destroy();
        this.viewer.destroy();
    }
}
