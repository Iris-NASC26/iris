"use client";
/**
 * Illustrative COBE globe for the landing hero.
 *
 * Forecast navigation: markers read a cached catalogue and link directly to
 * future ensemble predictions. No provider queries or scientific engines run here. The
 * scientific globe stays in the workspace; cobe is bundled into this
 * component's dynamic chunk and never reaches the scientific pages.
 */
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FORECAST_REGIONS, forecastHref } from "@/features/forecasts/model";
import { useForecastCatalogue } from "@/features/forecasts/useCatalogue";

const SPOTS = FORECAST_REGIONS.map(region => ({
    id: region.id, name: region.name, short: 'Rainfall forecast',
    location: [region.latitude, region.longitude] as [number, number],
}));
export const spotHref = (spot: { id: string }) => forecastHref(spot.id);

function webglAvailable(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
        return false;
    }
}

export function CobeGlobe({ dark }: { dark: boolean }) {
    const { cards, error: catalogueError } = useForecastCatalogue();
    const stage = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const [failed, setFailed] = useState(false);
    const [anchors, setAnchors] = useState(false);
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        setAnchors(CSS.supports("position-anchor", "--iris-cobe-probe"));
        if (!webglAvailable() || !canvas.current || !stage.current) {
            setFailed(true);
            return;
        }
        let cancelled = false;
        let globe: { update: (state: Record<string, unknown>) => void; destroy: () => void } | null = null;
        let frame = 0;
        let phi = 4.35;
        // Pause causes are tracked separately — whichever fires last must not
        // clear the others' reasons (e.g. a late IntersectionObserver entry
        // after a hover scrolls the globe into view).
        const pauses = { hover: false, offscreen: false, hidden: false };
        const updatePaused = () => setPaused(pauses.hover || pauses.offscreen || pauses.hidden);
        const pausedNow = () => pauses.hover || pauses.offscreen || pauses.hidden;
        let media: MediaQueryList | null = null;
        const reduced = () => media?.matches === true;
        const markers = SPOTS.map(spot => ({ id: spot.id, location: spot.location, size: 0.045 }));
        const render = () => {
            if (!globe || !stage.current || !canvas.current) return;
            if (!reduced()) phi += 0.0031;
            const size = stage.current.clientWidth;
            globe.update({
                phi,
                theta: 0.28,
                width: size * (window.devicePixelRatio || 1),
                height: size * (window.devicePixelRatio || 1),
                devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
                markers,
                dark: dark ? 1 : 0,
            });
        };
        const tick = () => {
            frame = 0;
            if (pausedNow()) return;
            render();
            schedule();
        };
        const schedule = () => {
            // Pause the whole frame loop while reduced-motion is requested;
            // a visibility/size change or unmount still lands the final frame.
            if (!reduced()) frame = requestAnimationFrame(tick);
        };
        const wake = () => {
            if (!frame) schedule();
        };
        const observer = new IntersectionObserver(entries => {
            pauses.offscreen = entries[0]?.isIntersecting === false;
            updatePaused();
            if (!pauses.offscreen) wake();
        }, { threshold: 0.05 });
        const onVisibility = () => {
            pauses.hidden = document.hidden;
            updatePaused();
            if (!pauses.hidden) wake();
        };
        const onHover = (inside: boolean) => { pauses.hover = inside; updatePaused(); if (!inside) wake(); };
        const enter = () => onHover(true);
        const leave = () => onHover(false);
        const resize = new ResizeObserver(() => render());
        void (async () => {
            try {
                const { default: createGlobe } = await import("cobe");
                if (cancelled || !canvas.current || !stage.current) return;
                media = window.matchMedia("(prefers-reduced-motion: reduce)");
                const size = stage.current.clientWidth;
                globe = createGlobe(canvas.current, {
                    width: size * (window.devicePixelRatio || 1),
                    height: size * (window.devicePixelRatio || 1),
                    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
                    phi,
                    theta: 0.28,
                    dark: dark ? 1 : 0,
                    diffuse: 1.35,
                    mapSamples: 14000,
                    mapBrightness: dark ? 5.4 : 4.4,
                    mapBaseBrightness: dark ? 0.16 : 0.1,
                    baseColor: dark ? [0.07, 0.32, 0.29] : [0.55, 0.75, 0.7],
                    markerColor: [0.06, 0.66, 0.5],
                    glowColor: dark ? [0.05, 0.28, 0.24] : [0.62, 0.84, 0.75],
                    markerElevation: 0.012,
                    scale: 1.04,
                    markers,
                });
                if (cancelled) { globe.destroy(); globe = null; return; }
                media.addEventListener("change", wake);
                observer.observe(stage.current);
                resize.observe(stage.current);
                document.addEventListener("visibilitychange", onVisibility);
                stage.current.addEventListener("mouseenter", enter);
                stage.current.addEventListener("mouseleave", leave);
                stage.current.addEventListener("focusin", enter);
                stage.current.addEventListener("focusout", leave);
                schedule();
                if (reduced()) render(); // one static frame
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
            if (frame) cancelAnimationFrame(frame);
            observer.disconnect();
            resize.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            media?.removeEventListener("change", wake);
            stage.current?.removeEventListener("mouseenter", enter);
            stage.current?.removeEventListener("mouseleave", leave);
            stage.current?.removeEventListener("focusin", enter);
            stage.current?.removeEventListener("focusout", leave);
            globe?.destroy();
        };
    }, [dark]);
    const anchorStyle = (id: string): CSSProperties =>
        ({ positionAnchor: `--cobe-${id}` }) as CSSProperties;
    return <div className={`landing-cobe${anchors && !failed ? " cobe-anchors" : ""}`} ref={stage}>
        {failed ? (
            <div className="landing-cobe-fallback" role="img" aria-label="Forecast navigation world map — choose a forecast below">
                <svg viewBox="0 0 360 180" aria-hidden="true">
                    <circle cx="180" cy="90" r="78" />
                    <path d="M104 90a76 76 0 0 1 152 0M104 90a76 76 0 0 0 152 0M180 12a112 78 0 0 1 0 156M180 12a112 78 0 0 0 0 156" />
                    {SPOTS.map(s => <circle key={s.id} cx={180 + s.location[1] * 0.42} cy={90 - s.location[0] * 0.8} r="4" className="landing-cobe-dot" />)}
                </svg>
            </div>
        ) : (
            <canvas ref={canvas} className="landing-cobe-canvas" role="img" aria-label="Rotating globe with six dataset forecast links. Each opens local predictions in the Forecasts workspace." />
        )}
        {SPOTS.map(spot => (
            <Link key={spot.id} href={forecastHref(spot.id, cards.find(c => c.id === spot.id)?.artifact_id) + (cards.find(c => c.id === spot.id)?.target ? `&target=${encodeURIComponent(cards.find(c => c.id === spot.id)!.target!)}` : "")} className="landing-cobe-marker" style={anchors && !failed ? { ...anchorStyle(spot.id), opacity: `var(--cobe-visible-${spot.id}, 0)`, pointerEvents: `var(--cobe-visible-${spot.id}, none)` } as unknown as CSSProperties : undefined}>
                <strong>{cards.find(c => c.id === spot.id)?.target_label || spot.short}</strong>
                <small>{spot.name} / {cards.find(c => c.id === spot.id)?.quality_status === "experimental_preview" ? "experimental preview" : "local ML predictions"}</small>
                <small>{(() => {
                    const card = cards.find(c => c.id === spot.id);
                    if (!card) return catalogueError ? 'Forecast unavailable' : 'Preparing forecast...';
                    if (card.state !== 'fresh') return card.state === 'stale' ? 'Expired / open to refresh' : 'Forecast unavailable';
                    if (card.kind === 'local_model' && card.median != null) return `${card.median.toFixed(2)} ${card.unit} / first forecast window`;
                    return card.peak_24h ? `${card.peak_24h.median?.toFixed(1)} mm / largest forecast-day median` : 'Open dataset forecasts';
                })()}</small>
            </Link>
        ))}
        {paused && !failed && <span className="landing-cobe-paused">Paused</span>}
        <p className="landing-cobe-status" role="status">{failed ? "Interactive globe unavailable — the forecast links still open the workspace." : "Forecast navigation. Markers show point outlooks, not a global hazard scan."}</p>
    </div>;
}
