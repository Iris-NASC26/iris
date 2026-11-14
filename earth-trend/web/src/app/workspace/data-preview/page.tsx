import { Suspense } from 'react';
import { PreviewPage } from '../../../features/preview/PreviewPage';

export default function DataPreviewPage() {
  return <Suspense fallback={<p>Loading preview selection…</p>}><PreviewPage /></Suspense>;
}
