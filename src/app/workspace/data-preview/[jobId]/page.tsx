"use client";

import { Suspense, use } from "react";
import { DataPreviewView } from "@/components/dashboard/DataPreviewView";

export default function DataPreviewJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  return (
    <Suspense fallback={<div className="dashboard-page-inner">Loading Data Preview…</div>}>
      <DataPreviewView routeJobId={jobId} />
    </Suspense>
  );
}
