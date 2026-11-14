import type { ReactNode } from 'react';
import { Workspace } from '../../features/workspace/Workspace';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Workspace>{children}</Workspace>;
}
