import { NEPAL_CASE_STUDY } from "@/features/case-studies/data/caseStudiesData";
import { CaseStudyTemplate } from "@/features/case-studies/common/CaseStudyTemplate";

export const metadata = {
  title: "Nepal 2026: Mountain Climate and Flood Risk · Project Iris",
  description:
    "Investigating temperature trends, snowpack dynamics, and hydrological risks in the high Himalayas.",
};

export default function NepalCaseStudyPage() {
  return <CaseStudyTemplate study={NEPAL_CASE_STUDY} backHref="/case-studies" />;
}
