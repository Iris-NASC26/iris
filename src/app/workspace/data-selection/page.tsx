import { Suspense } from 'react';
import { Catalog } from '@/features/catalog/Catalog';
export default function Page() {return <div className="earth-data-feature dashboard-page-inner"><Suspense fallback={<p>Loading catalog...</p>}><Catalog /></Suspense></div>;}
