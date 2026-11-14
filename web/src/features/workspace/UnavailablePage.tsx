import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';

const pages = {
  globe: { title: 'Living Globe', icon: 'globe', message: 'The scientific globe is waiting for validated global layers.', detail: 'NASA imagery, cell picking, trend relief and the accessible fallback will be connected in the globe tasks. No demonstration trends are displayed here.' },
  analysis: { title: 'Plot & visualize', icon: 'activity', message: 'Your observations come first.', detail: 'A validated monthly series and reviewed statistical methods are required before a Case File can be produced. Slopes, p-values, confidence intervals and Outlook remain unavailable.' },
  scan: { title: 'Regional Case Board', icon: 'layers', message: 'A regional investigation needs regional evidence.', detail: 'Area-weighted series, coverage checks and complete-family FDR must be connected before variables can be ranked. No regional grades or statistics are generated in the browser.' },
  'not-found': { title: 'Page not found', icon: 'search', message: 'That trail does not lead to a workspace page.', detail: 'Return to the overview or browse the approved variable list.' },
} as const;

export function UnavailablePage({ kind }: { kind: keyof typeof pages }) {
  const page = pages[kind];
  return <section className="empty-page"><p className="eyebrow">{kind === 'not-found' ? 'UNKNOWN ROUTE' : 'AWAITING VALIDATED DATA & METHODS'}</p>
    <h1>{page.title}</h1><div className="empty-panel"><span className="large-icon"><Icon name={page.icon} size={42} /></span>
      <h2>{page.message}</h2><p>{page.detail}</p><Link className="primary-button" to="/workspace/data-selection">Browse variables <Icon name="arrow" size={16} /></Link>
    </div></section>;
}
