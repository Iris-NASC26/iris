import { notFound } from "next/navigation";
import { investigation } from "@/features/hazards/model";
import { InvestigationWorkspace } from "@/features/hazards/InvestigationWorkspace";

export default async function Page({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const item = investigation(caseId);
  if (!item) notFound();
  return <InvestigationWorkspace key={item.id} item={item} />;
}
