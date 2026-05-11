import { Suspense } from "react";
import { ClipperContent } from "./clipper-content";

export default function ClipperDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background font-sans flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
      <ClipperContent />
    </Suspense>
  );
}
