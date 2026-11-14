import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface ReviewRequiredProps {
  title: string;
  message?: string;
}

export function ReviewRequired({
  title,
  message = 'This prototype workflow is preserved for further integration. Validated analysis is not available yet.',
}: ReviewRequiredProps) {
  return (
    <section className="dashboard-page-inner">
      <div className="case-library-hero"><div>
        <span className="section-kicker">Scientific admission pending</span>
        <h2>{title}</h2>
        <p>{message}</p>
        <Link href="/workspace/data-preview?variable=V01" className="dp-proceed-btn">
          Inspect real NASA data <Icon name="arrow" size={16} />
        </Link>
      </div></div>
    </section>
  );
}
