"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type * as CesiumTypes from "cesium";
import { DEMO_SCENES } from "./data/demoScenes";

type CesiumNS = typeof CesiumTypes;
let CesiumInstance: CesiumNS | null = null;

const GIBS_TILE_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpeg";
const GIBS_MATRIX_SET = "GoogleMapsCompatible_Level8";
const GIBS_MAX_LEVEL = 8;
const LOCAL_BASEMAP_URL = "/visualization/basemap-2048x1024.jpg";

const CESIUM_BUNDLE_URL = "/cesium/index.js";

interface CesiumImmersiveGlobeProps {
  selectedLocationId: string;
  comparisonLocationId: string | null;
  isAutoRotating: boolean;
  onSelectLocation: (id: string) => void;
  onScreenPointUpdate?: (point: { x: number; y: number; visible: boolean } | null) => void;
  onEngineReady?: () => void;
  resetSignal: number;
  zoomSignal: number;
}

export function CesiumImmersiveGlobe({
  selectedLocationId,
  comparisonLocationId,
  isAutoRotating,
  onSelectLocation,
  onScreenPointUpdate,
  onEngineReady,
  resetSignal,
  zoomSignal,
}: CesiumImmersiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumTypes.Viewer | null>(null);
  const pointsCollectionRef = useRef<CesiumTypes.PointPrimitiveCollection | null>(null);
  const arcEntityRef = useRef<CesiumTypes.Entity | null>(null);
  const lastUserInteractionTime = useRef<number>(Date.now());
  const isDragging = useRef(false);
  const [engineReady, setEngineReady] = useState(false);

  // Initialize Cesium Viewer
  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;

    async function initCesium() {
      try {
        (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
        if (!CesiumInstance) {
          CesiumInstance = (await import(
            /* webpackIgnore: true */ CESIUM_BUNDLE_URL
          )) as CesiumNS;
        }
        if (disposed || !container) return;
        const Cesium = CesiumInstance;

        // Imagery Provider (NASA GIBS with Local Fallback)
        let provider: CesiumTypes.ImageryProvider;
        try {
          provider = new Cesium.WebMapTileServiceImageryProvider({
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
            credit: "NASA EOSDIS GIBS / Blue Marble Shaded Relief (MODIS)",
            enablePickFeatures: false,
          });
        } catch {
          provider = new Cesium.SingleTileImageryProvider({
            url: LOCAL_BASEMAP_URL,
            rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
            credit: "NASA Visible Earth / Blue Marble",
          });
        }

        const baseLayer = new Cesium.ImageryLayer(provider, { alpha: 1.0 });

        const viewer = new Cesium.Viewer(container, {
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
          requestRenderMode: false, // Smooth cinematic continuous updates for rotation & reticle
          contextOptions: { webgl: { failIfMajorPerformanceCaveat: false } },
        });

        viewerRef.current = viewer;
        const scene = viewer.scene;

        // Realistic Earth Space & Atmosphere Settings
        scene.globe.baseColor = Cesium.Color.fromCssColorString("#030d17");
        scene.globe.tileCacheSize = 150;
        scene.globe.enableLighting = false; // Uniform bright satellite view matching reference
        scene.backgroundColor = Cesium.Color.fromCssColorString("#030a12");

        if (scene.skyAtmosphere) {
          scene.skyAtmosphere.show = true;
          scene.skyAtmosphere.saturationShift = 0.1;
          scene.skyAtmosphere.brightnessShift = 0.05;
        }

        const controls = scene.screenSpaceCameraController;
        controls.enableTilt = true;
        controls.minimumZoomDistance = 350000;
        controls.maximumZoomDistance = 45000000;

        // Opening camera target: Latitude: 15° N, Longitude: 80° E (Center-left South Asia view)
        const initialDestination = Cesium.Cartesian3.fromDegrees(80.0, 15.0, 1.48e7);
        viewer.camera.setView({
          destination: initialDestination,
          orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0.0,
          },
        });

        // Add Points primitive collection for observation markers
        const points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
        pointsCollectionRef.current = points;

        // Screen space event handler for interactions
        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

        handler.setInputAction(() => {
          isDragging.current = true;
          lastUserInteractionTime.current = Date.now();
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        handler.setInputAction(() => {
          isDragging.current = false;
          lastUserInteractionTime.current = Date.now();
        }, Cesium.ScreenSpaceEventType.LEFT_UP);

        handler.setInputAction((event: CesiumTypes.ScreenSpaceEventHandler.PositionedEvent) => {
          lastUserInteractionTime.current = Date.now();
          const picked = viewer.scene.pick(event.position);
          if (picked && picked.id && typeof picked.id === "string") {
            onSelectLocation(picked.id);
            return;
          }

          // Pick on ellipsoid
          const cartesian = viewer.camera.pickEllipsoid(event.position, scene.globe.ellipsoid);
          if (!cartesian) return;
          const c = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(c.latitude);
          const lon = Cesium.Math.toDegrees(c.longitude);

          // Find closest demo location within threshold (~5 degrees)
          let closestId = "";
          let minDistance = 6.0;
          Object.values(DEMO_SCENES).forEach((sceneItem) => {
            const dist = Math.hypot(sceneItem.latitude - lat, sceneItem.longitude - lon);
            if (dist < minDistance) {
              minDistance = dist;
              closestId = sceneItem.id;
            }
          });
          if (closestId) {
            onSelectLocation(closestId);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Frame update listener: handles slow auto-rotation and 2D reticle coordinate projection
        const onPreUpdate = () => {
          const now = Date.now();

          // Auto-rotation when idle
          const idleTime = now - lastUserInteractionTime.current;
          if (isAutoRotating && !isDragging.current && idleTime > 8000) {
            // ~1 revolution every 5 minutes (0.00035 rad/s)
            viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00035);
          }

          // Compute selected point screen position for the reticle and curved connector
          if (onScreenPointUpdate) {
            const selScene = DEMO_SCENES[selectedLocationId];
            if (selScene) {
              const pos3d = Cesium.Cartesian3.fromDegrees(selScene.longitude, selScene.latitude, 0);
              // Check if point is on visible hemisphere
              const cameraPos = viewer.camera.position;
              const dot = Cesium.Cartesian3.dot(
                Cesium.Cartesian3.normalize(pos3d, new Cesium.Cartesian3()),
                Cesium.Cartesian3.normalize(cameraPos, new Cesium.Cartesian3())
              );
              if (dot > 0.1) {
                const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, pos3d);
                if (screenPos) {
                  onScreenPointUpdate({ x: screenPos.x, y: screenPos.y, visible: true });
                } else {
                  onScreenPointUpdate({ x: 0, y: 0, visible: false });
                }
              } else {
                onScreenPointUpdate({ x: 0, y: 0, visible: false });
              }
            } else {
              onScreenPointUpdate(null);
            }
          }
        };

        const removeListener = scene.preUpdate.addEventListener(onPreUpdate);

        setEngineReady(true);
        if (onEngineReady) onEngineReady();

        return () => {
          removeListener();
          handler.destroy();
          viewer.destroy();
          viewerRef.current = null;
        };
      } catch (err) {
        console.error("Cesium initialization error:", err);
      }
    }

    const cleanupPromise = initCesium();

    return () => {
      disposed = true;
      cleanupPromise.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, [onSelectLocation, onScreenPointUpdate, onEngineReady, isAutoRotating, selectedLocationId]);

  // Update Points / Markers whenever selectedLocationId changes
  useEffect(() => {
    if (!engineReady || !CesiumInstance || !viewerRef.current || !pointsCollectionRef.current) return;
    const Cesium = CesiumInstance;
    const points = pointsCollectionRef.current;
    points.removeAll();

    Object.values(DEMO_SCENES).forEach((sceneItem) => {
      const isSelected = sceneItem.id === selectedLocationId;
      const isComparison = sceneItem.id === comparisonLocationId;

      points.add({
        id: sceneItem.id,
        position: Cesium.Cartesian3.fromDegrees(sceneItem.longitude, sceneItem.latitude, 5000),
        pixelSize: isSelected ? 12 : isComparison ? 10 : 7,
        color: isSelected
          ? Cesium.Color.fromCssColorString("#2fffe0")
          : isComparison
          ? Cesium.Color.fromCssColorString("#38bdf8")
          : Cesium.Color.fromCssColorString("#13e0c0").withAlpha(0.85),
        outlineColor: isSelected
          ? Cesium.Color.fromCssColorString("#ffffff")
          : Cesium.Color.BLACK.withAlpha(0.6),
        outlineWidth: isSelected ? 2.5 : 1.2,
      });
    });
  }, [engineReady, selectedLocationId, comparisonLocationId]);

  // Comparison Arc rendering
  useEffect(() => {
    if (!engineReady || !CesiumInstance || !viewerRef.current) return;
    const Cesium = CesiumInstance;
    const viewer = viewerRef.current;

    if (arcEntityRef.current) {
      viewer.entities.remove(arcEntityRef.current);
      arcEntityRef.current = null;
    }

    if (comparisonLocationId && comparisonLocationId !== selectedLocationId) {
      const loc1 = DEMO_SCENES[selectedLocationId];
      const loc2 = DEMO_SCENES[comparisonLocationId];
      if (loc1 && loc2) {
        arcEntityRef.current = viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              loc1.longitude,
              loc1.latitude,
              loc2.longitude,
              loc2.latitude,
            ]),
            width: 2.5,
            arcType: Cesium.ArcType.GEODESIC,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.3,
              taperPower: 0.8,
              color: Cesium.Color.fromCssColorString("#13e0c0"),
            }),
          },
        });
      }
    }
  }, [engineReady, selectedLocationId, comparisonLocationId]);

  // Smooth Fly-To when selectedLocationId updates
  useEffect(() => {
    if (!engineReady || !CesiumInstance || !viewerRef.current) return;
    const Cesium = CesiumInstance;
    const viewer = viewerRef.current;
    const targetScene = DEMO_SCENES[selectedLocationId];
    if (!targetScene) return;

    lastUserInteractionTime.current = Date.now();

    // Fly to location smoothly
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        targetScene.longitude,
        targetScene.latitude,
        6.5e6 // Maintain comfortable regional altitude
      ),
      duration: 1.8,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
    });
  }, [engineReady, selectedLocationId]);

  // Handle Zoom Signal
  useEffect(() => {
    if (zoomSignal === 0 || !viewerRef.current) return;
    const viewer = viewerRef.current;
    const height = viewer.camera.positionCartographic.height;
    viewer.camera.zoomIn(Math.max(120000, height * 0.28));
  }, [zoomSignal]);

  // Handle Reset Signal
  useEffect(() => {
    if (resetSignal === 0 || !viewerRef.current || !CesiumInstance) return;
    const viewer = viewerRef.current;
    const Cesium = CesiumInstance;
    const initialDestination = Cesium.Cartesian3.fromDegrees(80.0, 15.0, 1.48e7);
    viewer.camera.flyTo({
      destination: initialDestination,
      orientation: {
        heading: 0.0,
        pitch: -Cesium.Math.PI_OVER_TWO,
        roll: 0.0,
      },
      duration: 1.6,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
    });
  }, [resetSignal]);

  return <div className="iris-globe-stage" ref={containerRef} />;
}
