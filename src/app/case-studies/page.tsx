"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";
import { ManualCaseStudiesSection } from "@/components/case-studies/ManualCaseStudiesSection";

export default function CaseStudiesPage() {
  return (
    <PageShell
      action={
        <Link className="primary-page-button" href="/workspace">
          Start an investigation <Icon name="arrow" size={16} />
        </Link>
      }
      description="Our research team manually compiled five multi-sensor NASA satellite case studies to benchmark traditional Earth trend analysis against the Iris platform—proving how Iris turns hours of manual multi-catalog data wrangling into a fast, reproducible workflow."
      section="Case library & Manual Research Benchmark"
      title="Evidence from a changing planet"
    >
      <ManualCaseStudiesSection mode="public" />
    </PageShell>
  );
}
