'use client';
import { Suspense } from 'react';
import { PreviewPage } from '@/features/preview/PreviewPage';
export default function DataPreviewPage() { return <div className="earth-data-feature dashboard-page-inner"><Suspense fallback={<p>Loading source selection...</p>}><PreviewPage /></Suspense></div>; }
