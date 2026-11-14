import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_SCALE } from "../../src/features/visualization/model.ts";
import { DEFAULT_ORDER, imageryIndex, moveLayer } from "../../src/features/visualization/layers.ts";
import { DEFAULT_STYLE, ramp, rampColor, rampGradient, rangeLabel, styleRange, type FieldStyle } from "../../src/features/visualization/styles.ts";

const field = { variable_id: "V01", values: [-10, 0, 20, null] };

test("fixed range keeps the documented physical scale", () => {
    assert.deepEqual(styleRange(field, DEFAULT_STYLE), FIELD_SCALE.V01);
    assert.equal(styleRange({ variable_id: "V12", values: [100, 200] }, DEFAULT_STYLE)[0], 0);
});

test("auto range fits the loaded field and is labelled as such", () => {
    assert.deepEqual(styleRange(field, { ...DEFAULT_STYLE, rangeMode: "auto" }), [-10, 20]);
    assert.match(rangeLabel({ ...DEFAULT_STYLE, rangeMode: "auto" }, "V01"), /currently loaded field/i);
});

test("custom range applies only when ordered and numeric", () => {
    assert.deepEqual(styleRange(field, { rampId: "thermal", rangeMode: "custom", custom: [-20, 30] }), [-20, 30]);
    assert.deepEqual(styleRange(field, { rampId: "thermal", rangeMode: "custom", custom: [30, -20] }), FIELD_SCALE.V01);
    assert.deepEqual(styleRange(field, { rampId: "thermal", rangeMode: "custom", custom: null }), FIELD_SCALE.V01);
});

test("diverging ramps are symmetric around zero only when data crosses it", () => {
    const div: FieldStyle = { rampId: "coolwarm", rangeMode: "custom", custom: [-10, 20] };
    assert.deepEqual(styleRange(field, div), [-20, 20]);
    const pos = styleRange(field, { ...div, custom: [5, 20] });
    assert.deepEqual(pos, [5, 20]); // no invented zero meaning for one-sided data
    assert.equal(ramp("coolwarm").diverging, true);
});

test("rampColor interpolates and clamps at the domain ends", () => {
    const t = ramp("thermal");
    assert.equal(rampColor(-999, [0, 100], t), "#26407f");
    assert.equal(rampColor(999, [0, 100], t), "#f6df76");
    assert.equal(rampColor(50, [0, 100], t), "#1b978b"); // middle stop at t=0.5
    const v = ramp("viridis");
    assert.equal(rampColor(0, [0, 100], v), "#440154");
    assert.equal(rampColor(100, [0, 100], v), "#fde725");
});

test("rampGradient covers every stop for the legend", () => {
    const g = rampGradient(ramp("viridis"));
    assert.match(g, /^linear-gradient/);
    assert.equal((g.match(/rgb\(/g) ?? []).length, ramp("viridis").stops.length);
});

test("rangeLabel explains each range scope", () => {
    assert.match(rangeLabel({ ...DEFAULT_STYLE, rangeMode: "fixed" }, "V01"), /Fixed physical scale/);
    assert.match(rangeLabel({ ...DEFAULT_STYLE, rangeMode: "custom" }, "V01"), /Custom range/);
});

test("moveLayer reorders with keyboard semantics and respects bounds", () => {
    const order = moveLayer(DEFAULT_ORDER, "field", -1);
    assert.deepEqual(order, ["points", "field", "extent", "basemap"]);
    assert.deepEqual(moveLayer(DEFAULT_ORDER, "points", -1), DEFAULT_ORDER);
    assert.deepEqual(moveLayer(DEFAULT_ORDER, "basemap", 1), DEFAULT_ORDER);
});

test("imageryIndex maps top-to-bottom order onto imagery z indices", () => {
    assert.equal(imageryIndex(DEFAULT_ORDER, "basemap"), 0);
    assert.equal(imageryIndex(DEFAULT_ORDER, "field"), 1);
    assert.equal(imageryIndex(DEFAULT_ORDER, "points"), -1); // overlays are not imagery
    const swapped = moveLayer(moveLayer(DEFAULT_ORDER, "field", 1), "field", 1);
    assert.equal(imageryIndex(swapped, "field"), 0); // field below basemap
    assert.equal(imageryIndex(swapped, "basemap"), 1);
});
