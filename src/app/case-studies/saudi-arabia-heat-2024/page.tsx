import { SAUDI_CASE_STUDY } from "@/features/case-studies/data/caseStudiesData";
import { CaseStudyTemplate } from "@/features/case-studies/common/CaseStudyTemplate";

export const metadata = {
  title: "Hajj 2024: Investigating Extreme Heat · Project Iris",
  description:
    "Tracking daytime surface air temperatures and heat-dome anomalies during the 2024 Mecca pilgrimage.",
};

export default function SaudiHeatCaseStudyPage() {
  return <CaseStudyTemplate study={SAUDI_CASE_STUDY} backHref="/case-studies" />;
}
