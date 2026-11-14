"use client";

import { Suspense } from "react";
import { DataPreviewView } from "@/components/dashboard/DataPreviewView";

export default function DataPreviewPage() {
  return (
    <Suspense fallback={<div className="dashboard-page-inner">Loading Data Preview…</div>}>
      <DataPreviewView />
    </Suspense>
  );
}
