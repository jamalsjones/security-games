"use client";

// Shared frame for the DOM-based Play games: a dark 480-wide board, the same
// start and game-over overlay Firewall uses, and a personal best kept in
// localStorage. Firewall predates this and draws its own frame on a canvas.

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type Phase = "idle" | "running" | "over";

/** Personal best, read after mount: localStorage is unavailable during SSR. */
export function useBestScore(key: string) {
  const [best, setBest] = useState(0);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBest(Number(localStorage.getItem(key) ?? 0));
    } catch {}
  }, [key]);

  const record = useCallback(
    (score: number) => {
      try {
        const prev = Number(localStorage.getItem(key) ?? 0);
        if (score > prev) {
          localStorage.setItem(key, String(score));
          setBest(score);
        }
      } catch {}
    },
    [key]
  );

  return [best, record] as const;
}

export function GameShell({
  label,
  title,
  phase,
  best,
  intro,
  result,
  onStart,
  children,
}: {
  /** Accessible name for the board. */
  label: string;
  title: string;
  phase: Phase;
  best: number;
  /** Rules, shown before the first run. */
  intro: ReactNode;
  /** Score summary, shown when a run ends. */
  result: ReactNode;
  onStart: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full max-w-[480px] mx-auto select-none">
      <div
        role="region"
        aria-label={label}
        className="relative w-full min-h-[580px] sm:min-h-0 sm:aspect-[4/5] overflow-hidden rounded-2xl border border-graphite/15 bg-[#0f172a] text-slate-100"
      >
        {children}
      </div>

      {phase !== "running" && (
        <div className="absolute inset-0 rounded-2xl bg-carbon/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-8 text-center">
          {phase === "over" ? (
            result
          ) : (
            <>
              <p className="wordmark normal-case text-2xl text-concrete">{title}</p>
              <p className="text-concrete/70 text-sm leading-relaxed max-w-xs">{intro}</p>
              {best > 0 && <p className="text-concrete/45 text-xs">Personal best: {best}</p>}
            </>
          )}
          <button onClick={onStart} className="pill-light mt-2 cursor-pointer">
            {phase === "over" ? "Run it back" : "Start"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Thin countdown bar for timed rounds. */
export function TimerBar({ fraction }: { fraction: number }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="h-1 rounded-full bg-slate-700/60 overflow-hidden" aria-hidden>
      <div
        className={`h-full transition-[width] duration-100 ease-linear ${
          pct < 30 ? "bg-red-400" : "bg-slate-200/80"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
