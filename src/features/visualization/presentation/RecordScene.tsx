"use client";
import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Material } from "three";
import type { RecordScene as SceneModel } from "./model";
import { format } from "../model";

export function RecordScene({
  model,
  dark,
  selectedTime,
  focusYear,
  onSelect,
  onUnavailable,
}: {
  model: SceneModel;
  dark: boolean;
  selectedTime: number | null;
  focusYear: number | null;
  onSelect: (time: number) => void;
  onUnavailable: (reason: string) => void;
}) {
  const mount = useRef<HTMLDivElement>(null),
    overlay = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null),
    [ready, setReady] = useState(false);
  const latest = useRef({ onSelect, onUnavailable, selectedTime, focusYear });
  latest.current = { onSelect, onUnavailable, selectedTime, focusYear };
  const update = useRef<(() => void) | null>(null),
    reset = useRef<(() => void) | null>(null);
  useEffect(() => {
    const node = mount.current,
      labels = overlay.current;
    if (!node || !labels) return;
    let disposed = false,
      cleanup: (() => void) | undefined;
    const probe = document.createElement("canvas"),
      gl = probe.getContext("webgl2");
    if (!gl) {
      latest.current.onUnavailable(
        "3D is unavailable on this device. The equivalent 2D view is ready.",
      );
      return;
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    void Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ])
      .then(([T, { OrbitControls }]) => {
        if (disposed) return;
        const scene = new T.Scene(),
          background = new T.Color(dark ? "#101e1b" : "#f4f9f7");
        const renderer = new T.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(background, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        node.appendChild(renderer.domElement);
        const camera = new T.PerspectiveCamera(40, 1, 0.1, 150);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.minDistance = 12;
        controls.maxDistance = 55;
        controls.maxPolarAngle = Math.PI * 0.87;
        const home = () => {
          camera.position.set(
            model.mode === "cycle" ? 15 : 10,
            model.mode === "cycle" ? 16 : 9,
            model.mode === "cycle" ? 19 : 17,
          );
          controls.target.set(0, 2.8, 0);
          controls.update();
        };
        scene.add(
          new T.HemisphereLight("#f5fffc", dark ? "#38564b" : "#acbfb2", 2.1),
        );
        const light = new T.DirectionalLight("#fff3dc", 3);
        light.position.set(4, 14, 8);
        scene.add(light);
        const geometries: BufferGeometry[] = [],
          materials: Material[] = [];
        const addLine = (coords: number[][], color: string, opacity = 0.4) => {
          const geometry = new T.BufferGeometry().setFromPoints(
            coords.map(
              (p) => new T.Vector3(...(p as [number, number, number])),
            ),
          );
          geometries.push(geometry);
          const material = new T.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
          });
          materials.push(material);
          scene.add(new T.Line(geometry, material));
        };
        const guide = dark ? "#56766b" : "#99b9ac";
        if (model.mode === "cycle") {
          for (const y of [-0.2, 3, 6])
            addLine(
              Array.from({ length: 97 }, (_, i) => [
                Math.cos((i / 96) * Math.PI * 2) * 7.3,
                y,
                Math.sin((i / 96) * Math.PI * 2) * 7.3,
              ]),
              guide,
              0.22,
            );
          for (const radius of [3, 5, 7])
            addLine(
              Array.from({ length: 97 }, (_, i) => [
                Math.cos((i / 96) * Math.PI * 2) * radius,
                -0.25,
                Math.sin((i / 96) * Math.PI * 2) * radius,
              ]),
              guide,
              0.32,
            );
          for (let m = 0; m < 12; m++) {
            const a = (m / 12) * Math.PI * 2 - Math.PI / 2;
            addLine(
              [
                [Math.cos(a) * 2.6, -0.25, Math.sin(a) * 2.6],
                [Math.cos(a) * 7.4, -0.25, Math.sin(a) * 7.4],
              ],
              guide,
              0.22,
            );
          }
          addLine(
            [
              [-8, 0, 0],
              [-8, 6, 0],
            ],
            guide,
            0.5,
          );
        } else {
          for (let i = 0; i < 5; i++)
            addLine(
              [
                [-8 + i * 4, 0, 0],
                [-8 + i * 4, 6, 0],
              ],
              guide,
              0.16,
            );
          for (let i = 0; i < 3; i++)
            addLine(
              [
                [-8, i * 3, 0],
                [8, i * 3, 0],
              ],
              guide,
              0.2,
            );
          addLine(
            [
              [-8, 0, 0],
              [8, 0, 0],
            ],
            guide,
            0.65,
          );
          addLine(
            [
              [-8, 0, 0],
              [-8, 6, 0],
            ],
            guide,
            0.65,
          );
        }
        const sphere = new T.SphereGeometry(0.07, 12, 8),
          tube = new T.CylinderGeometry(0.022, 0.022, 1, 7);
        geometries.push(sphere, tube);
        const material = new T.MeshStandardMaterial({
          roughness: 0.32,
          metalness: 0.12,
        });
        materials.push(material);
        const points = new T.InstancedMesh(
            sphere,
            material,
            model.points.length,
          ),
          paths = new T.InstancedMesh(tube, material, model.segments.length);
        scene.add(points, paths);
        const dummy = new T.Object3D(),
          from = new T.Vector3(),
          to = new T.Vector3(),
          direction = new T.Vector3(),
          up = new T.Vector3(0, 1, 0);
        const colorFor = (i: number) => {
          const point = model.points[i],
            f =
              model.mode === "cycle"
                ? (point.year - model.years[0]) /
                  Math.max(1, model.years.at(-1)! - model.years[0])
                : (point.row.value! - model.range[0]) /
                  (model.range[1] - model.range[0]);
          const color = new T.Color("#219bba").lerp(new T.Color("#e5a963"), f);
          if (
            latest.current.focusYear !== null &&
            point.year !== latest.current.focusYear
          )
            color.lerp(background, 0.82);
          return color;
        };
        const draw = () => {
          if (disposed) return;
          model.points.forEach((p, i) => {
            dummy.position.set(...p.position);
            dummy.quaternion.identity();
            const selected = p.row.time === latest.current.selectedTime;
            dummy.scale.setScalar(selected ? 2.4 : 1);
            dummy.updateMatrix();
            points.setMatrixAt(i, dummy.matrix);
            points.setColorAt(
              i,
              selected
                ? new T.Color(dark ? "#fff0aa" : "#145547")
                : colorFor(i),
            );
          });
          model.segments.forEach(([a, b], i) => {
            from.set(...model.points[a].position);
            to.set(...model.points[b].position);
            direction.subVectors(to, from);
            dummy.position.copy(from).add(to).multiplyScalar(0.5);
            dummy.quaternion.setFromUnitVectors(
              up,
              direction.clone().normalize(),
            );
            dummy.scale.set(1, direction.length(), 1);
            dummy.updateMatrix();
            paths.setMatrixAt(i, dummy.matrix);
            paths.setColorAt(i, colorFor(b));
          });
          points.instanceMatrix.needsUpdate = true;
          paths.instanceMatrix.needsUpdate = true;
          if (points.instanceColor) points.instanceColor.needsUpdate = true;
          if (paths.instanceColor) paths.instanceColor.needsUpdate = true;
          renderer.render(scene, camera);
          const width = node.clientWidth,
            height = node.clientHeight;
          model.labels.forEach((label, i) => {
            const p = new T.Vector3(...label.position).project(camera),
              el = labels.children[i] as HTMLElement | undefined;
            if (el) {
              el.style.transform = `translate(${(p.x * 0.5 + 0.5) * width}px,${(-p.y * 0.5 + 0.5) * height}px) translate(-50%,-50%)`;
              el.style.visibility =
                p.z < 1 && Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.98
                  ? "visible"
                  : "hidden";
            }
          });
        };
        const resize = () => {
          const w = Math.max(1, node.clientWidth),
            h = Math.max(1, node.clientHeight);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          draw();
        };
        const ray = new T.Raycaster(),
          pointer = new T.Vector2();
        let down: [number, number] | null = null;
        const hit = (event: PointerEvent) => {
          const box = renderer.domElement.getBoundingClientRect();
          pointer.set(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            (-(event.clientY - box.top) / box.height) * 2 + 1,
          );
          ray.setFromCamera(pointer, camera);
          return ray.intersectObject(points)[0]?.instanceId;
        };
        const move = (event: PointerEvent) => {
          const index = hit(event);
          setHover(index ?? null);
          renderer.domElement.style.cursor =
            index === undefined ? "grab" : "pointer";
        };
        const start = (event: PointerEvent) => {
          down = [event.clientX, event.clientY];
        };
        const end = (event: PointerEvent) => {
          if (
            down &&
            Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 5
          ) {
            const index = hit(event);
            if (index !== undefined)
              latest.current.onSelect(model.points[index].row.time);
          }
          down = null;
        };
        const leave = () => setHover(null);
        const lost = (event: Event) => {
          event.preventDefault();
          latest.current.onUnavailable(
            "The 3D graphics context was lost. The equivalent 2D view is ready.",
          );
        };
        renderer.domElement.addEventListener("pointermove", move);
        renderer.domElement.addEventListener("pointerdown", start);
        renderer.domElement.addEventListener("pointerup", end);
        renderer.domElement.addEventListener("pointerleave", leave);
        renderer.domElement.addEventListener("webglcontextlost", lost);
        controls.addEventListener("change", draw);
        home();
        const observer = new ResizeObserver(resize);
        observer.observe(node);
        resize();
        update.current = draw;
        reset.current = () => {
          home();
          draw();
        };
        setReady(true);
        cleanup = () => {
          observer.disconnect();
          controls.removeEventListener("change", draw);
          controls.dispose();
          renderer.domElement.removeEventListener("pointermove", move);
          renderer.domElement.removeEventListener("pointerdown", start);
          renderer.domElement.removeEventListener("pointerup", end);
          renderer.domElement.removeEventListener("pointerleave", leave);
          renderer.domElement.removeEventListener("webglcontextlost", lost);
          for (const g of geometries) g.dispose();
          for (const m of materials) m.dispose();
          points.dispose();
          paths.dispose();
          renderer.forceContextLoss();
          renderer.dispose();
          renderer.domElement.remove();
          update.current = null;
          reset.current = null;
        };
      })
      .catch(() => {
        if (!disposed)
          latest.current.onUnavailable(
            "The 3D renderer could not load. The equivalent 2D view is ready.",
          );
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [model, dark]);
  useEffect(() => {
    update.current?.();
  }, [selectedTime, focusYear]);
  const point = hover === null ? null : model.points[hover];
  return (
    <div
      className={`viz-record-scene viz-record-${model.mode}`}
      role="group"
      aria-label="3D observation scene and camera controls"
    >
      <div
        className="viz-record-mount"
        ref={mount}
        role="img"
        aria-label={`Interactive 3D ${model.mode === "cycle" ? "seasonal orbit" : "time track"}. ${model.points.length} source observations in ${model.unit}. Missing observations are not connected.`}
      />
      <div className="viz-record-labels" ref={overlay} aria-hidden="true">
        {model.labels.map((label, i) => (
          <span key={i} data-kind={label.kind}>
            {label.text}
          </span>
        ))}
      </div>
      <div className="viz-record-scene-caption">
        <span>
          {model.mode === "cycle"
            ? "ANGLE / MONTH · HEIGHT / YEAR · RADIUS / VALUE"
            : "X / TIME · HEIGHT / VALUE · DEPTH / PRESENTATION"}
        </span>
        <button onClick={() => reset.current?.()}>Reset camera</button>
      </div>
      {!ready && (
        <span className="viz-render-status" role="status">
          Preparing the source-data scene…
        </span>
      )}
      {point && (
        <div className="viz-record-tooltip">
          <strong>{point.row.timestamp}</strong>
          <span>
            {format(point.row.value)} {model.unit}
          </span>
          <small>Source observation · {point.row.qa}</small>
        </div>
      )}
    </div>
  );
}
