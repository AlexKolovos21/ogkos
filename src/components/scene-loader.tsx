import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";

const BuildingScene = lazy(() => import("@/components/scene/building-scene"));

class SceneGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Το μοντέλο δεν φόρτωσε. Ανανέωσε τη σελίδα.
        </div>
      );
    }
    return this.props.children;
  }
}

export function SceneLoader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setOn(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, []);
  if (!on) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Φόρτωση μοντέλου…
      </div>
    );
  }
  return (
    <div className="h-full w-full">
      <SceneGuard>
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Φόρτωση μοντέλου…
            </div>
          }
        >
          <BuildingScene />
        </Suspense>
      </SceneGuard>
    </div>
  );
}
