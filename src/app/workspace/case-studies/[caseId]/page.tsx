import { notFound } from "next/navigation";
import { investigation } from "@/features/hazards/model";
import { InvestigationWorkspace } from "@/features/hazards/InvestigationWorkspace";
import { HeleneArticle } from "@/features/case-studies/helene";
import { getCaseStudyBySlug } from "@/features/case-studies/data/caseStudiesData";
import { CaseStudyTemplate } from "@/features/case-studies/common/CaseStudyTemplate";

export default async function Page({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  if (caseId === "hurricane-helene-2024") {
    return <HeleneArticle />;
  }

  const customStudy = getCaseStudyBySlug(caseId);
  if (customStudy) {
    return <CaseStudyTemplate study={customStudy} backHref="/workspace/case-studies" />;
  }

  const item = investigation(caseId);
  if (!item) notFound();
  return <InvestigationWorkspace key={item.id} item={item} />;
}
