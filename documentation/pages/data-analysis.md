# Data Analysis — Interactive Workbench & Step-by-Step Case File

The **Data Analysis** page is Iris's interactive statistical workbench. Instead of a static batch of checkboxes, it provides an intuitive card-based method selector, per-method parameter controls, automatic dataset compatibility checks, step-by-step cumulative execution, and downloadable high-resolution charts.

> Navigate to it via: **Workspace → Data Analysis** in the left sidebar.

---

## 1. Dataset Compatibility & Readiness

Not every statistical method is valid for every temporal frequency or sample size. For example, **Daily** or **Yearly** datasets cannot be analyzed with calendar-month methods such as **Seasonal Kendall** or the **12-Month Seasonal Fingerprint**, whereas **Monthly** datasets spanning multiple years support all eight methods.

At the top of the left control panel, Iris inspects your active dataset and displays a **Dataset Compatibility Profile**:
- **Cadence Badge**: Shows whether the active series is `Daily`, `8-Day`, `16-Day`, `Monthly`, `Seasonal`, or `Yearly`.
- **Observation Coverage**: Reports valid observation count, completeness percentage, and year span.
- **Per-Method Eligibility**: Each analysis card displays a clear `Compatible` badge or a specific requirement badge (e.g., `Requires Monthly Data` or `Requires ≥ 10 Valid Points`) explaining why a method is enabled or locked for the current dataset.

---

## 2. Intuitive Method Cards, Parameters & `(i)` Documentation Links

Each analysis method is presented as an interactive card in the left pane:

1. **Hover `(i)` Tooltip**: Hovering over (or focusing) the `(i)` icon on any method card reveals a concise explanation of the statistical method, what it tests, and when to use it.
2. **Click `(i)` to Open Full Documentation**: Clicking the `(i)` icon opens the method's dedicated documentation page in a new browser tab with complete mathematical formulas, pipeline steps, parameter definitions, and interpretation guides:
   - [Linear Trend · OLS t-Test](#method-ols)
   - [Mann–Kendall Trend Test (Hamed–Rao)](#method-hamed-rao-mk)
   - [Seasonal Kendall Test](#method-seasonal-kendall)
   - [Sen's Slope Estimator](#method-sen-slope)
   - [Pettitt Change-Point Screen](#method-pettitt)
   - [Anomaly Review](#method-anomalies)
   - [Seasonal Fingerprint Heatmap](#method-seasonal-fingerprint)
   - [Full Case File Diagnostics](#method-case-file-diagnostics)
3. **Adjustable Method Parameters**: Expanding or selecting a method card lets you customize its statistical parameters (such as significance level \(\alpha\), confidence interval width, autocorrelation lag limit, anomaly \(|z|\) threshold, MAD vs. SD dispersion, minimum segment length, or outlook horizon) before running or re-running that method.

---

## 3. Step-by-Step Cumulative Analysis Workflow

You do **not** have to select and run all analyses in a single step:

- **Run One Method at a Time**: You can first select and run **Linear trend · OLS t-test** (either via the card's quick **Run** button or the main action button). Its results immediately appear in a dedicated section on the right pane.
- **Add Additional Analyses Later**: Next, you can select **Mann–Kendall trend test** or **Pettitt change-point screen** and run it. Iris preserves your initial OLS t-test results and appends the new analysis section on the right pane—you never have to run your initial analysis twice.
- **Update Parameters & Re-Run In Place**: If you adjust a parameter for a method you already ran (for example, changing the Anomaly \(|z|\) threshold from `2.0` to `1.5`), you can re-run just that method to update its section while keeping all other completed sections intact.

---

## 4. Separate Method Sections & Downloadable Charts

On the right-hand results pane:
- **Completed Analyses Navigation Bar**: Shows all completed analysis steps in order so you can jump directly to any section or export the full Case File (CSV / JSON).
- **Dedicated Section per Analysis Method**: Every executed analysis method is rendered in its own structured card section with:
  - Exact statistical values, confidence intervals, test statistics, and parameter badges
  - Method-specific visualization with accurate axis ticks, interactive hover readouts, and value callouts
  - **Download Image (PNG)** button on every chart so you can export publication-ready figures directly from any analysis section.
