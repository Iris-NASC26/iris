"use client";
import { PageShell } from '@/components/layout/PageShell';
import { EvidencePage } from '@/features/evidence/EvidencePage';
export default function MethodologyPage() {
 return <PageShell section="Methods" title="Evidence and methods" description="Approved methodology and current scientific release gates."><div className="earth-data-feature"><EvidencePage /></div></PageShell>;
}
