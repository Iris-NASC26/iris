"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import ScientificCaseFile from "@/features/visualization/ScientificCaseFile";
import { VisualizationWorkspace } from "@/features/visualization/Workspace";
import { parsePreview } from "@/features/visualization/model";
function ScientificView({ jobId }: {
    jobId: string | null;
}) {
    const { extractedPreview, setExtractedPreview } = useDashboard();
    const [error, setError] = useState('');
    useEffect(() => {
        if (!jobId || extractedPreview?.job_id === jobId)
            return;
        const controller = new AbortController();
        setError('');
        void fetch(`/api/v1/timeseries/jobs/${encodeURIComponent(jobId)}/preview?page_size=1000`, { signal: controller.signal, cache: 'no-store' })
            .then(async (response) => { if (!response.ok)
            throw new Error('The requested extraction job could not be loaded.'); return parsePreview(await response.json()); })
            .then(preview => { if (!controller.signal.aborted)
            setExtractedPreview(preview); })
            .catch(reason => { if (!controller.signal.aborted)
            setError(reason instanceof Error ? reason.message : 'Job unavailable.'); });
        return () => controller.abort();
    }, [jobId, extractedPreview?.job_id]);
    if (error)
        return <p role="alert" style={{ padding: 24 }}>{error} Return to the studio and choose an available result.</p>;
    if (jobId && extractedPreview?.job_id !== jobId)
        return <p style={{ padding: 24 }}>Loading the requested source observations...</p>;
    return <ScientificCaseFile />;
}
function View() {
    const params = useSearchParams(), jobId = params.get('jobId');
    return params.get('view') === 'analysis' ? <>
    <div style={{ padding: '16px 24px' }}><Link href={`/workspace/visualize${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''}`}>Back to Data Visualization</Link></div>
    <ScientificView jobId={jobId}/>
  </> : <VisualizationWorkspace />;
}
export default function Page() { return <Suspense fallback={<p>Loading Data Visualization...</p>}><View /></Suspense>; }
