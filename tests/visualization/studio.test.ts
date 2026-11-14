import test from "node:test";
import assert from "node:assert/strict";
import { PANEL_DEFS, PANEL_IDS, PRESETS, presetLayout } from "../../src/features/visualization/studio/presets.ts";
import { defaultPrefs, layoutPanels, LAYOUT_VERSION, parsePrefs, STORAGE_KEY } from "../../src/features/visualization/studio/layoutPersistence.ts";
import { isCaseFileAnalysis, outlookCapabilities } from "../../src/features/visualization/adapters/analysisResult.ts";
import { deviation, standardize, paired } from "../../src/features/visualization/model.ts";

test("every preset serializes into a dockview layout with registered panels", () => {
    for (const preset of PRESETS) {
        const layout = presetLayout(preset) as { panels: Record<string, { id: string }>; grid: { root: { type: string } } };
        assert.equal(layout.grid.root.type, "branch", preset.id);
        assert.deepEqual(Object.keys(layout.panels).sort(), [...PANEL_IDS].sort(), `${preset.id} places all registered panels`);
    }
});

test("preset trees keep curated panels in their primary position", () => {
    const explore = presetLayout(PRESETS.find(p => p.id === "explore")!) as { grid: { root: { data: [{ type: string; data: { views: string[]; activeView: string } }] } } };
    assert.equal(explore.grid.root.data[0].data.views[0], "timeseries");
    assert.equal(explore.grid.root.data[0].data.activeView, "timeseries");
    assert.ok(!PRESETS.some(p => p.id === "earth-time"));
    assert.ok(!(PANEL_IDS as string[]).includes("map"));
    assert.ok(!(PANEL_IDS as string[]).includes("outlook"));
    assert.ok(!PRESETS.some(p => p.id === 'outlook'));
});

test("corrupt JSON falls back to defaults without throwing", () => {
    const { prefs, recovered } = parsePrefs("{not json");
    assert.equal(recovered, "corrupt");
    assert.equal(prefs.preset, "explore");
    assert.equal(prefs.layout, null);
});

test("unsupported versions keep a valid preset but drop the stored layout", () => {
    const raw = JSON.stringify({ version: 99, preset: "seasonal", layout: { grid: { root: {} } }, hidden: ["map"] });
    const { prefs, recovered } = parsePrefs(raw);
    assert.equal(recovered, "version");
    assert.equal(prefs.preset, "seasonal");
    assert.equal(prefs.layout, null);
    assert.deepEqual(prefs.hidden, []);
});

test("unknown panel ids and non-object layouts are stripped", () => {
    const raw = JSON.stringify({ version: LAYOUT_VERSION, preset: "explore", layout: "bad", hidden: ["source", "map", "ghost-panel", 7] });
    const { prefs, recovered } = parsePrefs(raw);
    assert.equal(recovered, "ok");
    assert.equal(prefs.layout, null);
    assert.deepEqual(prefs.hidden, ["source"]);
    assert.deepEqual(defaultPrefs().version, LAYOUT_VERSION);
    assert.equal(STORAGE_KEY.includes("v2"), true);
});

test("layoutPanels reports only known panels from a saved layout", () => {
    const layout = presetLayout(PRESETS[0]);
    assert.deepEqual(layoutPanels(layout).sort(), [...PANEL_IDS].sort());
    assert.deepEqual(layoutPanels({ panels: { a: { id: "timeseries" }, b: { id: "removed-panel" } } }), ["timeseries"]);
    assert.deepEqual(layoutPanels(null), []);
});

test("saved Outlook arrangements cannot restore the removed studio panel", () => {
    const { prefs } = parsePrefs(JSON.stringify({ version: LAYOUT_VERSION, preset: 'outlook',
        hidden: ['outlook'], layout: { grid: {}, panels: {
            timeseries: { id: 'timeseries', contentComponent: 'timeseries' },
            outlook: { id: 'outlook', contentComponent: 'outlook' },
        } } }));
    assert.equal(prefs.preset, 'explore');
    assert.equal(prefs.layout, null);
    assert.deepEqual(prefs.hidden, []);
});

const outlook = (over: object = {}) => ({
    not_a_prediction_label: "Trend Continuation Projection — Not a Climate Model Forecast",
    horizon_year: 2050,
    continuation_points: [{ year: 2030, central_value: 1.2, ci_low: 0.4, ci_high: 2.0 }],
    skill_gate_passed: false,
    backtest_rmse: null, climatology_baseline_rmse: null, skill_score_pss: null,
    skill_gate_reason: "Backtest skill did not exceed the climatology baseline.",
    short_term_forecast_points: [],
    cmip6_Reference_note: "note",
    ...over,
});

test("analysis result adapter accepts a valid contract and rejects incomplete payloads", () => {
    const valid = { result_id: "r1", analysis_series: [], unit: "°C", dataset_name: "T2M", requested_analysis_methods: ["sen_slope"], outlook: outlook() };
    assert.equal(isCaseFileAnalysis(valid), true);
    assert.equal(isCaseFileAnalysis({ ...valid, outlook: { ...outlook(), skill_gate_passed: "yes" } }), false);
    assert.equal(isCaseFileAnalysis({ result_id: "r1" }), false);
    assert.equal(isCaseFileAnalysis(null), false);
});

test("outlook capabilities suppress short-term rendering when the gate fails and never claim calibrated intervals", () => {
    const caps = outlookCapabilities(outlook());
    assert.equal(caps.continuation, true);
    assert.equal(caps.shortTerm, false);
    assert.equal(caps.calibratedIntervals, false);
    assert.match(caps.gateReason, /climatology/i);
    const passed = outlookCapabilities(outlook({ skill_gate_passed: true, short_term_forecast_points: [{ year: 2026, central_value: 0.1, ci_low: -0.2, ci_high: 0.3 }] }));
    assert.equal(passed.shortTerm, true);
});

test("zero-variance series reports deviation zero instead of a fake signal", () => {
    const rows = [1, 2, 3].map(i => ({ time: Date.UTC(2024, i), timestamp: `2024-0${i + 1}`, value: 5, sourceValue: 5, qa: "ok" }));
    assert.equal(deviation(rows), 0);
    const z = standardize(rows);
    assert.ok(z.every(r => r.value === 0), "flat series standardizes to zeros and the UI labels it unavailable");
    assert.equal(deviation([]), null);
});

test("exact timestamp pairing keeps the pair's real timestamp", () => {
    const mk = (m: number, v: number | null) => ({ time: Date.UTC(2024, m), timestamp: `2024-${String(m + 1).padStart(2, "0")}`, value: v, sourceValue: v, qa: "ok" });
    const a = [mk(0, 1), mk(1, null), mk(2, 3)];
    const b = [mk(0, 9), mk(1, 8), mk(2, 7)];
    const pairs = paired(a, b);
    assert.equal(pairs.length, 2);
    assert.deepEqual(pairs[0], [1, 9, "2024-01"], "missing/flagged months never fabricate a pair");
});
