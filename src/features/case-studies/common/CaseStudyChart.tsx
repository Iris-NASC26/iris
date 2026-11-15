"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import type { CaseStudySeries } from "./types";

interface CaseStudyChartProps {
  seriesList: CaseStudySeries[];
  defaultSeriesId?: string;
  eventAnnotation?: {
    date: string;
    label: string;
  };
  allowMonthCompare?: boolean;
  defaultMonth?: number; // 1-12
  isSaudiCase?: boolean;
  isDitwahCase?: boolean;
}

export function CaseStudyChart({
  seriesList,
  defaultSeriesId,
  eventAnnotation,
  allowMonthCompare = false,
  defaultMonth = 6, // June default for Saudi heat
  isSaudiCase = false,
  isDitwahCase = false,
}: CaseStudyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsInstanceRef = useRef<any>(null);

  const [activeSeriesId, setActiveSeriesId] = useState<string>(
    defaultSeriesId || (seriesList[0] ? seriesList[0].id : "")
  );
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [monthCompareMode, setMonthCompareMode] = useState<boolean>(false);
  const [targetMonth, setTargetMonth] = useState<number>(defaultMonth);
  const [showAccumulation, setShowAccumulation] = useState<boolean>(false);

  const activeSeries = useMemo(() => {
    return seriesList.find((s) => s.id === activeSeriesId) || seriesList[0];
  }, [seriesList, activeSeriesId]);

  // Extract unique years for filtering
  const availableYears = useMemo(() => {
    if (!activeSeries || !activeSeries.data) return [];
    const years = new Set<string>();
    activeSeries.data.forEach((d) => {
      const y = d.date.slice(0, 4);
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [activeSeries]);

  // Process data points according to conversion, filtering, or month comparison
  const processedData = useMemo(() => {
    if (!activeSeries || !activeSeries.data) return [];

    let raw = activeSeries.data;

    // Filter by year if specific year is selected
    if (selectedYear !== "ALL" && !monthCompareMode) {
      raw = raw.filter((d) => d.date.startsWith(selectedYear));
    }

    // If month comparison mode is enabled (e.g. for Saudi Arabia comparing all June months)
    if (monthCompareMode) {
      const monthStr = targetMonth.toString().padStart(2, "0");
      raw = raw.filter((d) => {
        const parts = d.date.split("-");
        return parts.length >= 2 && parts[1] === monthStr;
      });
    }

    return raw.map((d) => {
      let val = d.val;
      // Kelvin to Celsius for Saudi heat
      if (isSaudiCase && activeSeries.meta.nativeUnit === "K") {
        val = val - 273.15;
      } else if (activeSeries.conversion) {
        val = activeSeries.conversion(val);
      }

      // If Ditwah rainfall accumulation toggle is enabled: kg m-2 s-1 to mm/month (approx 30 days)
      if (isDitwahCase && activeSeries.id === "ditwah_rain" && showAccumulation) {
        val = val * 86400 * 30; // mm per month
      }

      return {
        date: d.date,
        time: d.time,
        val: Number(val.toFixed(5)),
      };
    });
  }, [activeSeries, selectedYear, monthCompareMode, targetMonth, showAccumulation, isSaudiCase, isDitwahCase]);

  // Baseline calculation (for month comparison or reference line)
  const baselineStats = useMemo(() => {
    if (!processedData.length) return null;
    const vals = processedData.map((d) => d.val);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    return { mean, max, min };
  }, [processedData]);

  // ECharts render effect
  useEffect(() => {
    let disposed = false;

    async function initChart() {
      if (!chartRef.current) return;
      const echarts = await import("echarts");
      if (disposed || !chartRef.current) return;

      if (!echartsInstanceRef.current) {
        echartsInstanceRef.current = echarts.init(chartRef.current, undefined, {
          renderer: "canvas",
        });
      }

      const instance = echartsInstanceRef.current;

      const unit = isSaudiCase
        ? "°C"
        : isDitwahCase && activeSeries.id === "ditwah_rain" && showAccumulation
        ? "mm / month"
        : activeSeries.meta.displayUnit || activeSeries.meta.nativeUnit;

      const color = activeSeries.color || "#159d7e";

      const markLines: any[] = [];
      if (baselineStats && monthCompareMode) {
        markLines.push({
          yAxis: Number(baselineStats.mean.toFixed(2)),
          name: "Historical Mean",
          lineStyle: { color: "#e5a158", type: "dashed", width: 1.5 },
          label: {
            formatter: `Mean: {c} ${unit}`,
            position: "end",
            color: "#e5a158",
            fontSize: 10,
          },
        });
      }

      if (eventAnnotation && !monthCompareMode) {
        markLines.push({
          xAxis: eventAnnotation.date,
          name: eventAnnotation.label,
          lineStyle: { color: "#e05252", type: "solid", width: 2 },
          label: {
            formatter: eventAnnotation.label,
            position: "start",
            color: "#e05252",
            fontSize: 11,
            fontWeight: "bold",
          },
        });
      }

      const option = {
        animation: true,
        animationDuration: 400,
        backgroundColor: "transparent",
        grid: {
          left: 65,
          right: 35,
          top: 40,
          bottom: 60,
        },
        tooltip: {
          trigger: "axis",
          backgroundColor: "#11212a",
          borderColor: "rgba(218, 232, 229, 0.2)",
          textStyle: { color: "#f5f3ec", fontSize: 12 },
          formatter: (params: any) => {
            const item = params[0];
            if (!item) return "";
            return `
              <div style="font-weight: 600; margin-bottom: 4px; color: #a0b2b8;">${item.axisValue}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
                <span>${activeSeries.name}: <strong>${Number(item.data[1]).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })} ${unit}</strong></span>
              </div>
            `;
          },
        },
        xAxis: {
          type: "category",
          data: processedData.map((d) => d.date),
          axisLine: { lineStyle: { color: "rgba(218, 232, 229, 0.2)" } },
          axisLabel: { color: "#95a8b0", fontSize: 11 },
        },
        yAxis: {
          type: "value",
          scale: true,
          name: unit,
          nameTextStyle: { color: "#95a8b0", fontSize: 11, align: "left" },
          splitLine: { lineStyle: { color: "rgba(218, 232, 229, 0.08)" } },
          axisLabel: { color: "#95a8b0", fontSize: 11 },
        },
        dataZoom: [
          {
            type: "slider",
            bottom: 8,
            height: 20,
            borderColor: "rgba(218, 232, 229, 0.15)",
            backgroundColor: "#0d1a22",
            fillerColor: "rgba(21, 157, 126, 0.18)",
            handleStyle: { color: "#159d7e" },
            textStyle: { color: "#95a8b0", fontSize: 10 },
          },
          {
            type: "inside",
          },
        ],
        series: [
          {
            name: activeSeries.name,
            type: monthCompareMode ? "bar" : "line",
            smooth: false,
            symbol: processedData.length < 50 ? "circle" : "none",
            symbolSize: 6,
            showSymbol: processedData.length < 50,
            itemStyle: { color: color },
            lineStyle: { width: 2, color: color },
            areaStyle: monthCompareMode
              ? undefined
              : {
                  color: {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: `${color}44` },
                      { offset: 1, color: `${color}00` },
                    ],
                  },
                },
            data: processedData.map((d) => [d.date, d.val]),
            markLine: markLines.length
              ? {
                  silent: true,
                  symbol: "none",
                  data: markLines,
                }
              : undefined,
          },
        ],
      };

      instance.setOption(option, true);
    }

    initChart();

    const handleResize = () => {
      echartsInstanceRef.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
    };
  }, [
    processedData,
    activeSeries,
    baselineStats,
    monthCompareMode,
    eventAnnotation,
    isSaudiCase,
    isDitwahCase,
    showAccumulation,
  ]);

  // Clean up chart instance on unmount
  useEffect(() => {
    return () => {
      echartsInstanceRef.current?.dispose();
      echartsInstanceRef.current = null;
    };
  }, []);

  const handleResetZoom = () => {
    if (echartsInstanceRef.current) {
      echartsInstanceRef.current.dispatchAction({
        type: "dataZoom",
        start: 0,
        end: 100,
      });
    }
  };

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <div className="case-chart-container">
      {/* Chart Control Bar */}
      <div className="case-chart-controls">
        {/* Variable Selector Tabs */}
        {seriesList.length > 1 && (
          <div className="case-var-tabs" role="tablist">
            {seriesList.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeSeriesId === s.id}
                className={`case-var-btn ${activeSeriesId === s.id ? "active" : ""}`}
                onClick={() => {
                  setActiveSeriesId(s.id);
                  setSelectedYear("ALL");
                }}
              >
                <span
                  className="case-var-dot"
                  style={{ backgroundColor: s.color || "#159d7e" }}
                />
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Secondary Filter & Mode Tools */}
        <div className="case-chart-actions">
          {/* Ditwah rainfall accumulation toggle */}
          {isDitwahCase && activeSeries.id === "ditwah_rain" && (
            <button
              type="button"
              className={`case-pill-btn ${showAccumulation ? "active" : ""}`}
              onClick={() => setShowAccumulation(!showAccumulation)}
            >
              {showAccumulation ? "Units: Monthly Depth (mm)" : "Units: Raw Rate (kg m⁻² s⁻¹)"}
            </button>
          )}

          {/* Month Compare Mode (e.g. for Saudi Arabia Heat) */}
          {allowMonthCompare && (
            <div className="case-month-compare-controls">
              <button
                type="button"
                className={`case-pill-btn ${monthCompareMode ? "active" : ""}`}
                onClick={() => setMonthCompareMode(!monthCompareMode)}
              >
                {monthCompareMode ? "Return to Continuous Record" : "Compare Across Years by Month"}
              </button>

              {monthCompareMode && (
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="case-select-dropdown"
                  aria-label="Select calendar month to compare"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Every {name} (2004–2026)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Year Filter Dropdown */}
          {!monthCompareMode && availableYears.length > 3 && (
            <div className="case-year-selector">
              <label htmlFor="year-select" style={{ fontSize: "11px", color: "#95a8b0" }}>
                Filter Year:
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="case-select-dropdown"
              >
                <option value="ALL">Full Time Horizon ({activeSeries.data.length} pts)</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="case-reset-btn"
            onClick={handleResetZoom}
            title="Reset Chart Zoom Range"
          >
            Reset Zoom
          </button>
        </div>
      </div>

      {/* Verified Observation Banner for Active Variable */}
      {activeSeries.meta.verifiedObservation && (
        <div className="case-verified-badge-row">
          <span className="case-badge-pill">NASA GES DISC TELEMETRY</span>
          <span className="case-badge-val">
            Target observation: <strong>{activeSeries.meta.verifiedObservation}</strong>
          </span>
          <span className="case-badge-period">
            Coverage: {activeSeries.meta.coverage.start} to {activeSeries.meta.coverage.end} ({activeSeries.meta.coverage.count} observations)
          </span>
        </div>
      )}

      {/* Main ECharts Canvas */}
      <div className="case-echarts-box" ref={chartRef} style={{ width: "100%", height: "380px" }} />

      {/* Stats Footnote */}
      {baselineStats && (
        <div className="case-chart-footer">
          <span>Range: {baselineStats.min.toFixed(4)} to {baselineStats.max.toFixed(4)}</span>
          <span>Sample Mean: {baselineStats.mean.toFixed(4)}</span>
          {eventAnnotation && (
            <span style={{ color: "#e05252" }}>
              Event Marker: {eventAnnotation.date} ({eventAnnotation.label})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
