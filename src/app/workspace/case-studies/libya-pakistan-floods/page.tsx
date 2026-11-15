import { LIBYA_PAKISTAN_CASE_STUDY } from "@/features/case-studies/data/caseStudiesData";
import { CaseStudyTemplate } from "@/features/case-studies/common/CaseStudyTemplate";

export const metadata = {
  title: "Extreme Floods: Libya and Pakistan · Project Iris",
  description:
    "Comparative satellite audit of Storm Daniel's Mediterranean deluge (Derna 2023) and Indus Basin pre-saturated soils (Pakistan 2022).",
};

export default function WorkspaceLibyaPakistanCaseStudyPage() {
  return <CaseStudyTemplate study={LIBYA_PAKISTAN_CASE_STUDY} backHref="/workspace/case-studies" />;
}
