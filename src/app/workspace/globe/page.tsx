import { Suspense } from "react";
import { VisualizationWorkspace } from "@/features/visualization/Workspace";
export default function Page() { return <Suspense fallback={<p>Loading Earth workspace...</p>}><VisualizationWorkspace initialView="globe"/></Suspense>; }
