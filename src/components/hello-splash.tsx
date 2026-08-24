import { useEffect, useState } from "react";

export function HelloSplash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 5000);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      className="hello-splash"
      role="status"
      aria-live="polite"
      onAnimationEnd={(e) => {
        if (e.animationName.includes("hello-hold")) setShow(false);
      }}
    >
      <p className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Γεια σου φιλεεε</p>
    </div>
  );
}
