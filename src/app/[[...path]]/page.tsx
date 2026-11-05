import { Suspense } from "react";
import BugTrailApp from "@/components/bugtrail-app";

export default function Page() {
  return (
    <Suspense
      fallback={<div className="loading-state">Открываем BugTrail…</div>}
    >
      <BugTrailApp />
    </Suspense>
  );
}
