import { Suspense } from "react";
import { ImmersiveEarthPage } from "@/features/immersive-earth/ImmersiveEarthPage";

export default function GlobePage() {
  return (
    <Suspense fallback={<div style={{ background: "#030a12", width: "100vw", height: "100vh" }} />}>
      <ImmersiveEarthPage />
    </Suspense>
  );
}
