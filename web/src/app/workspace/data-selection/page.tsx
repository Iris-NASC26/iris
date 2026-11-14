import { Suspense } from 'react';
import { Catalog } from '../../../features/catalog/Catalog';

export default function DataSelectionPage() {
  return <Suspense fallback={<p>Loading variable selection…</p>}><Catalog /></Suspense>;
}
