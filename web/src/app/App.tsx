import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PreferencesProvider } from '../state/preferences';
import { Workspace } from '../features/workspace/Workspace';
import { Overview } from '../features/workspace/Overview';
import { Catalog } from '../features/catalog/Catalog';
import { PreviewPage } from '../features/preview/PreviewPage';
import { EvidencePage } from '../features/evidence/EvidencePage';
import { UnavailablePage } from '../features/workspace/UnavailablePage';

export function App() {
  return <BrowserRouter><PreferencesProvider><Routes>
    <Route path="/" element={<Navigate to="/workspace" replace />} />
    <Route path="/workspace" element={<Workspace />}>
      <Route index element={<Overview />} />
      <Route path="data-selection" element={<Catalog />} />
      <Route path="data-preview" element={<PreviewPage />} />
      <Route path="evidence" element={<EvidencePage />} />
      <Route path="globe" element={<UnavailablePage kind="globe" />} />
      <Route path="visualize" element={<UnavailablePage kind="analysis" />} />
      <Route path="case-board" element={<UnavailablePage kind="scan" />} />
      <Route path="*" element={<UnavailablePage kind="not-found" />} />
    </Route>
    <Route path="*" element={<Navigate to="/workspace/not-found" replace />} />
  </Routes></PreferencesProvider></BrowserRouter>;
}
