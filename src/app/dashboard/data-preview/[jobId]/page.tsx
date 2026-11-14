import { redirect } from "next/navigation";

export default async function DashboardDataPreviewJobRedirect({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(`/workspace/data-preview/${encodeURIComponent(jobId)}`);
}
