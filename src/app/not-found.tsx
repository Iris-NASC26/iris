"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";

export default function NotFoundPage() {
  return (
    <PageShell
      description="The coordinates you followed do not lead to an active Iris page."
      section="404"
      title="This trail has gone cold"
    >
      <section className="not-found">
        <div className="empty-visual">
          <div className="scan-ring ring-one" />
          <div className="scan-ring ring-two" />
          <Icon name="globe" size={72} />
          <div className="lens">
            <Icon name="search" size={34} />
          </div>
        </div>
        <p>Return to the workbench or explore one of our published cases.</p>
        <div>
          <Link className="primary-page-button" href="/workspace">
            Open workbench
          </Link>
          <Link className="secondary-page-button" href="/case-studies">
            Browse cases
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
