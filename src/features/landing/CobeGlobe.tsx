"use client";
/**
 * Illustrative COBE globe for the landing hero.
 *
 * Navigation illustration only — markers link to the workspace with a location
 * prefilled; they carry no measurements, live badges or trend claims. The
 * scientific globe stays in the workspace; cobe is bundled into this
 * component's dynamic chunk and never reaches the scientific pages.
 */
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { REGION_PRESETS } from "@/lib/dataRetrievalEngine";
import { investigationHref } from '@/features/hazards/model';

interface StudySpot {
    id: string;
    name: string;
    short: string;
    topic: string;
    location: [number, number];
    investigationId?: string;
}
/** Supported study locations — labels/topics are descriptive, not measurements. */
const SPOT_SOURCE: StudySpot[] = [
    { id: "los-angeles", name: "Los Angeles County, CA", short: "Los Angeles", topic: "Urban heat", location: [34.05, -118.24] },
    { id: "california", name: "California Central Valley, USA", short: "Central Valley", topic: "Agricultural drought", location: [36.77, -119.41] },
    { id: "amazon", name: "Central Amazon Basin, Brazil", short: "Amazon Basin", topic: "Forest & hydrology", location: [-3.75, -60.0] },
    { id: "mediterranean", name: "Mediterranean Europe", short: "Mediterranean", topic: "Heatwaves & aridity", location: [41.25, 9.25] },
    { id: "sri-lanka", name: "Colombo, Western Province, Sri Lanka", short: "Cyclone Ditwah", topic: "2025 historical investigation", location: [6.9355, 79.8487], investigationId: 'ditwah-sri-lanka-2025' },
    { id: "himalaya", name: "Kathmandu, Nepal", short: "Nepal floods", topic: "2024 historical investigation", location: [27.7172, 85.324], investigationId: 'nepal-floods-2024' },
];
const SPOTS = SPOT_SOURCE.filter(spot => REGION_PRESETS.some(r => r.id === spot.id));

export const spotHref = (spot: Pick<StudySpot, "name" | "location" | "investigationId">) =>
    spot.investigationId ? investigationHref(spot.investigationId) : `/workspace/globe?place=${encodeURIComponent(spot.name)}&lat=${spot.location[0]}&lon=${spot.location[1]}`;

function webglAvailable(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
        return false;
    }
}

export function CobeGlobe({ dark }: { dark: boolean }) {
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
            <div className="landing-cobe-fallback" role="img" aria-label="Illustrative world map — choose a study location below">
                <svg viewBox="0 0 360 180" aria-hidden="true">
                    <circle cx="180" cy="90" r="78" />
                    <path d="M104 90a76 76 0 0 1 152 0M104 90a76 76 0 0 0 152 0M180 12a112 78 0 0 1 0 156M180 12a112 78 0 0 0 0 156" />
                    {SPOTS.map(s => <circle key={s.id} cx={180 + s.location[1] * 0.42} cy={90 - s.location[0] * 0.8} r="4" className="landing-cobe-dot" />)}
                </svg>
            </div>
        ) : (
            <canvas ref={canvas} className="landing-cobe-canvas" role="img" aria-label="Illustrative rotating globe marking six supported study locations. Use the location links to open the workspace." />
        )}
        {SPOTS.map(spot => (
            <Link key={spot.id} href={spotHref(spot)} className="landing-cobe-marker" style={anchors && !failed ? { ...anchorStyle(spot.id), opacity: `var(--cobe-visible-${spot.id}, 0)`, pointerEvents: `var(--cobe-visible-${spot.id}, none)` } as unknown as CSSProperties : undefined}>
                <strong>{spot.short}</strong>
                <small>{spot.topic}</small>
            </Link>
        ))}
        {paused && !failed && <span className="landing-cobe-paused">Paused</span>}
        <p className="landing-cobe-status" role="status">{failed ? "Interactive globe unavailable — the study locations below still open the workspace." : "Illustrative globe. Disaster markers open historical investigations, not active warnings."}</p>
    </div>;
}
