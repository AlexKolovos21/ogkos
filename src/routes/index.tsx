import { ControlPanel, PanelHeader } from "@/components/control-panel";
import { HelloSplash } from "@/components/hello-splash";
import { ResultsBar, Warnings } from "@/components/results-bar";
import { SceneLoader } from "@/components/scene-loader";
import { Button } from "@/components/ui/button";
import { ViewportToolbar } from "@/components/viewport-toolbar";
import { useProject } from "@/store/project";
import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useLayoutEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ui, setUi] = useState(false);
  const panelOpen = useProject((s) => s.panelOpen);
  const setPanelOpen = useProject((s) => s.setPanelOpen);

  useLayoutEffect(() => {
    setUi(true);
    void useProject.persist.rehydrate();
  }, []);

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <HelloSplash />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[24rem] shrink-0 flex-col border-r border-border bg-card lg:flex">
          <PanelHeader />
          <div className="min-h-0 flex-1">
            {ui ? (
              <ControlPanel />
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">Οικόπεδο · Κτίριο · Διαμερίσματα</p>
            )}
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="stage-sky relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <SceneLoader />
            </div>
            <ViewportToolbar />
            <div className="absolute top-3 left-3 z-20 lg:hidden">
              <Button type="button" size="sm" variant="secondary" className="h-10 shadow-[var(--shadow-border)]" onClick={() => setPanelOpen(true)}>
                <SlidersHorizontal />
                Στοιχεία
              </Button>
            </div>
          </div>
          <footer className="shrink-0 border-t border-border bg-card px-3 py-2.5 sm:px-5 sm:py-3">
            <ResultsBar />
            <div className="mt-2">
              <Warnings />
            </div>
          </footer>
        </section>
      </div>

      {panelOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-background/70" aria-label="Κλείσιμο" onClick={() => setPanelOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,24rem)] flex-col bg-card shadow-[var(--shadow-border)]">
            <PanelHeader onClose={() => setPanelOpen(false)} />
            <div className="min-h-0 flex-1">
              <ControlPanel />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
