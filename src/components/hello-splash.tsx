import { useEffect, useState } from "react";

const HOLD_MS = 5000;

export function HelloSplash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), HOLD_MS - 450);
    const hide = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={leaving ? "hello-splash hello-splash-out" : "hello-splash"} role="status" aria-live="polite">
      <p className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Γεια σου φιλεεε</p>
    </div>
  );
}
