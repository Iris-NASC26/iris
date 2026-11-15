import { DITWAH_CASE_STUDY } from "@/features/case-studies/data/caseStudiesData";
import { CaseStudyTemplate } from "@/features/case-studies/common/CaseStudyTemplate";

export const metadata = {
  title: "Cyclone Ditwah: Sri Lanka's Hydrological Shock · Project Iris",
  description:
    "Standardized satellite audit of pre-saturated soils, rainfall rates, and runoff surge during the November 2025 cyclone.",
};

export default function DitwahCaseStudyPage() {
  return <CaseStudyTemplate study={DITWAH_CASE_STUDY} backHref="/case-studies" />;
}
