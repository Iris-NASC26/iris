"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ForecastWorkspace } from "@/features/forecasts/ForecastWorkspace";
import { FORECAST_REGIONS } from "@/features/forecasts/model";

function ForecastRoute() {
  const params = useSearchParams();
  const id = params.get("forecastId") || FORECAST_REGIONS[0].id;
  const artifactId = params.get("run") || undefined;

  return (
    <ForecastWorkspace
      key={`${id}:${artifactId || "current"}`}
      id={id}
      artifactId={artifactId}
    />
  );
}

export default function ForecastsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page-inner">Loading forecasts...</div>}>
      <ForecastRoute />
    </Suspense>
  );
}
