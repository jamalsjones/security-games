"use client";

// Token Inspector: decoded access tokens arrive at an API one at a time. Pass
// the good ones, or point at the one claim that makes a token unacceptable.
// Every call shows the reason, like Phish or Legit's tells.
//
// The checks follow RFC 7519 (JWT), RFC 8725 (JWT best practices) and
// RFC 9068 (JWT access tokens). Northpeak is the same invented employer as in
// Phish or Legit; payroll-api is its API. Each flawed token has one flaw.

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, TimerBar, shuffle, useBestScore, type Phase } from "./GameShell";

type Line = { part: "header" | "payload"; key: string; value: string; note?: string };
type Token = {
  request: { call: string; needs: string };
  lines: Line[];
  signature: string;
  /** The key of the bad claim, or null when the token should pass. */
  flaw: string | null;
  tell: string;
};

const ISSUER = "https://login.northpeak.com";
const API = "payroll-api";
const READ = { call: "GET /payslips", needs: "payslips.read" };

const ago = (min: number) => (min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`);
const ahead = (min: number) => (min < 60 ? `in ${min} min` : `in ${Math.round(min / 60)} h`);
// A fixed "now" keeps the numbers stable; the notes carry the meaning.
const NOW = 1793000000;
const at = (min: number): Pick<Line, "value" | "note"> => ({
  value: String(NOW + min * 60),
  note: min < 0 ? ago(-min) : ahead(min),
});

/** A good token for payroll-api; each deck entry changes what it needs to. */
function token({
  header = {},
  payload = {},
  extraHeader = [],
}: {
  header?: Partial<Record<"alg" | "typ" | "kid", string>>;
  payload?: Partial<Record<"iss" | "sub" | "aud" | "scope", string>> & {
    exp?: Pick<Line, "value" | "note">;
    iat?: Pick<Line, "value" | "note">;
    nbf?: Pick<Line, "value" | "note">;
  };
  extraHeader?: Line[];
} = {}): Line[] {
  return [
    { part: "header", key: "alg", value: `"${header.alg ?? "RS256"}"` },
    { part: "header", key: "typ", value: `"${header.typ ?? "at+jwt"}"` },
    { part: "header", key: "kid", value: `"${header.kid ?? "np-2026-10"}"` },
    ...extraHeader,
    { part: "payload", key: "iss", value: `"${payload.iss ?? ISSUER}"` },
    { part: "payload", key: "sub", value: `"${payload.sub ?? "u-48213"}"` },
    { part: "payload", key: "aud", value: payload.aud ?? `"${API}"` },
    { part: "payload", key: "iat", ...(payload.iat ?? at(-12)) },
    ...(payload.nbf ? [{ part: "payload" as const, key: "nbf", ...payload.nbf }] : []),
    { part: "payload", key: "exp", ...(payload.exp ?? at(48)) },
    { part: "payload", key: "scope", value: `"${payload.scope ?? "payslips.read profile"}"` },
  ];
}

const SIGNED = "verifies with the issuer's key";

const FLAWED: Token[] = [
  {
    request: READ,
    lines: token({ header: { alg: "none" } }),
    signature: "(empty)",
    flaw: "alg",
    tell: "alg \"none\" means there's no signature, so anyone could have written this. RFC 8725 says not to accept it, and an API never should.",
  },
  {
    request: READ,
    lines: token({ payload: { iat: at(-100), exp: at(-40) } }),
    signature: SIGNED,
    flaw: "exp",
    tell: "It expired 40 minutes ago. A good signature doesn't make an expired token usable again.",
  },
  {
    request: READ,
    lines: token({ payload: { nbf: at(120), exp: at(180) } }),
    signature: SIGNED,
    flaw: "nbf",
    tell: "nbf is two hours from now. A token mustn't be accepted before its not-before time.",
  },
  {
    request: READ,
    lines: token({ payload: { aud: `"expenses-api"` } }),
    signature: SIGNED,
    flaw: "aud",
    tell: "It was issued for expenses-api. The audience check is what stops a token meant for one API being replayed at another.",
  },
  {
    request: READ,
    lines: token({ payload: { iss: "https://login.northpeak.co" } }),
    signature: "verifies with a key from login.northpeak.co",
    flaw: "iss",
    tell: "A lookalike issuer: .co, not .com. Compare the issuer exactly, and take keys only from the issuer you trust.",
  },
  {
    request: READ,
    lines: token({ header: { alg: "HS256" } }),
    signature: "HMAC, computed with the issuer's public key",
    flaw: "alg",
    tell: "This API expects RS256. Taking the algorithm from the token invites algorithm confusion: the public key used as an HMAC secret. Pin the algorithm.",
  },
  {
    request: READ,
    lines: token({ header: { typ: "JWT" }, payload: { aud: `"${API}"` } }),
    signature: SIGNED,
    flaw: "typ",
    tell: "typ is JWT, not at+jwt. RFC 9068 has APIs reject any other type, which keeps ID tokens and other JWTs from passing as access tokens.",
  },
  {
    request: READ,
    lines: token({
      extraHeader: [{ part: "header", key: "jku", value: `"https://keys.cdn-jwks.net/k.json"` }],
    }),
    signature: "verifies with the key at keys.cdn-jwks.net",
    flaw: "jku",
    tell: "jku points to a key on a host the issuer doesn't own, so whoever wrote the token supplied the key that verifies it. Fetch keys from the issuer's published JWKS, never from a URL in the token.",
  },
  {
    request: { call: "POST /payroll/run", needs: "payroll.run" },
    lines: token(),
    signature: SIGNED,
    flaw: "scope",
    tell: "A valid token with the wrong permission. It can read payslips, but running payroll needs payroll.run, so the answer is 403.",
  },
  {
    request: READ,
    lines: token({ payload: { iat: at(-1440 * 3), exp: at(-1440 * 2) } }),
    signature: SIGNED,
    flaw: "exp",
    tell: "Expired two days ago. Old tokens turn up in logs and browser storage; the expiry check is what makes them worthless.",
  },
];

const VALID: Token[] = [
  {
    request: READ,
    lines: token(),
    signature: SIGNED,
    flaw: null,
    tell: "Right issuer, right audience, RS256, at+jwt, in date, and it has payslips.read. Pass it.",
  },
  {
    request: READ,
    lines: token({ payload: { aud: `["${API}", "expenses-api"]` } }),
    signature: SIGNED,
    flaw: null,
    tell: "aud can be a list. It only has to include this API, and it does.",
  },
  {
    request: READ,
    lines: token({ payload: { iat: at(-58), exp: at(2) } }),
    signature: SIGNED,
    flaw: null,
    tell: "Two minutes left is still in date. Near expiry isn't expired.",
  },
  {
    request: READ,
    lines: token({ payload: { sub: "svc-payroll-sync", scope: "payslips.read" } }),
    signature: SIGNED,
    flaw: null,
    tell: "A machine's token. With no user involved, as in client credentials, RFC 9068 has sub name the client itself.",
  },
  {
    request: READ,
    lines: token({ header: { typ: "application/at+jwt" } }),
    signature: SIGNED,
    flaw: null,
    tell: "application/at+jwt is the long form of at+jwt, and RFC 9068 accepts either.",
  },
  {
    request: { call: "POST /payroll/run", needs: "payroll.run" },
    lines: token({ payload: { sub: "u-10077", scope: "payslips.read payroll.run" } }),
    signature: SIGNED,
    flaw: null,
    tell: "It has payroll.run, and everything else checks out. Pass it.",
  },
];

const ROUND = 10;
const VALID_PER_ROUND = 4;
const SECONDS = 25;
const FEEDBACK_MS = 7000;

type Call = { pass: true } | { pass: false; key: string };
type Feedback = { right: boolean; half: boolean; timedOut: boolean };

export function TokenInspector() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<Token[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [best, recordBest] = useBestScore("token-inspector-best");
  const scoreRef = useRef(0);

  const current = queue[index];

  const start = () => {
    setQueue(shuffle([...shuffle(VALID).slice(0, VALID_PER_ROUND), ...shuffle(FLAWED).slice(0, ROUND - VALID_PER_ROUND)]));
    setIndex(0);
    setSelected(0);
    setScore(0);
    scoreRef.current = 0;
    setCorrect(0);
    setStreak(0);
    setTimeLeft(SECONDS);
    setFeedback(null);
    setPhase("running");
  };

  const answer = useCallback(
    (call: Call | null) => {
      if (phase !== "running" || feedback || !current) return;
      const right = call !== null && (call.pass ? current.flaw === null : call.key === current.flaw);
      // Rejecting a bad token for the wrong reason earns a little, never a streak.
      const half = call !== null && !call.pass && current.flaw !== null && !right;
      setFeedback({ right, half, timedOut: call === null });
      if (right) {
        const gained = 10 + Math.ceil(timeLeft / 2) + Math.min(streak, 5) * 2;
        scoreRef.current += gained;
        setCorrect((c) => c + 1);
        setStreak((s) => s + 1);
      } else {
        if (half) scoreRef.current += 3;
        setStreak(0);
      }
      setScore(scoreRef.current);
    },
    [phase, feedback, current, timeLeft, streak]
  );

  useEffect(() => {
    if (phase !== "running" || feedback) return;
    const t = setTimeout(() => {
      if (timeLeft <= 0.1) answer(null);
      else setTimeLeft((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10));
    }, 100);
    return () => clearTimeout(t);
  }, [phase, feedback, timeLeft, answer]);

  const advance = useCallback(() => {
    setFeedback(null);
    if (index + 1 >= queue.length) {
      recordBest(scoreRef.current);
      setPhase("over");
    } else {
      setIndex((i) => i + 1);
      setSelected(0);
      setTimeLeft(SECONDS);
    }
  }, [index, queue.length, recordBest]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(advance, FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [feedback, advance]);

  useEffect(() => {
    if (phase !== "running" || !current) return;
    const onKey = (e: KeyboardEvent) => {
      if (feedback) {
        if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          advance();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = current.lines.length;
        setSelected((s) => (s + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        answer({ pass: false, key: current.lines[selected].key });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        answer({ pass: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, feedback, selected, answer, advance]);

  const lineClass = (line: Line, i: number) => {
    if (feedback) {
      if (line.key === current.flaw) return "bg-red-500/20 ring-1 ring-red-400/70";
      return "";
    }
    return i === selected ? "bg-slate-600/50 ring-1 ring-slate-300/50" : "hover:bg-slate-700/50";
  };

  return (
    <GameShell
      label="Token Inspector game"
      title="Token Inspector"
      phase={phase}
      best={best}
      onStart={start}
      intro={
        <>
          You&apos;re payroll-api. Tokens arrive decoded, one at a time.{" "}
          <span className="text-green-400 font-semibold">Pass</span> the good ones, or pick the claim
          that breaks a bad one and <span className="text-red-400 font-semibold">reject</span> it.
          Twenty-five seconds each. Tap, or use ↑ ↓ to pick, ← to reject, → to pass.
        </>
      }
      result={
        <>
          <p className="wordmark normal-case text-2xl text-concrete">Shift over</p>
          <p className="text-concrete/70 text-sm">
            Score: <span className="text-concrete">{score}</span>
            {" · "}
            {correct}/{queue.length} correct
            {best > 0 && (
              <>
                {" · "}Best: <span className="text-concrete">{best}</span>
              </>
            )}
          </p>
        </>
      }
    >
      {current && (
        <div className="absolute inset-0 flex flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between font-mono text-[13px] font-bold text-slate-200/90">
            <span>SCORE {score}</span>
            <span>
              {index + 1}/{queue.length}
            </span>
          </div>
          <div className="mt-3">
            <TimerBar fraction={feedback ? 0 : timeLeft / SECONDS} />
          </div>

          <p className="mt-3 text-left font-mono text-[11.5px] leading-relaxed text-slate-400">
            <span className="text-slate-200">{current.request.call}</span> · needs {current.request.needs}
            <br />
            trusts {ISSUER.replace("https://", "")} · aud {API} · RS256 · at+jwt
          </p>

          <div className="mt-3 flex-1 min-h-0 overflow-y-auto rounded-xl bg-slate-800/70 border border-slate-700/60 p-1.5 sm:p-2 text-left font-mono text-[11px] leading-[1.35] sm:text-[12.5px] sm:leading-normal">
            {(["header", "payload"] as const).map((part) => (
              <div key={part} className={part === "payload" ? "mt-1" : ""}>
                <p className="px-2 pt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">{part}</p>
                {current.lines.map((line, i) =>
                  line.part !== part ? null : (
                    <button
                      key={line.key}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => (i === selected ? answer({ pass: false, key: line.key }) : setSelected(i))}
                      className={`flex w-full items-baseline gap-1.5 sm:gap-2 rounded-md px-1.5 sm:px-2 py-px sm:py-[2px] text-left transition-colors cursor-pointer disabled:cursor-default ${lineClass(line, i)}`}
                    >
                      <span className="text-sky-300">{line.key}</span>
                      <span className="min-w-0 break-all text-slate-100">{line.value}</span>
                      {line.note && <span className="ml-auto shrink-0 text-slate-500">{line.note}</span>}
                    </button>
                  )
                )}
              </div>
            ))}
            <p className="mt-1 px-2 pb-0.5 text-[11.5px] text-slate-400">
              <span className="text-slate-500">signature</span> {current.signature}
            </p>
          </div>

          <div aria-live="polite" className="min-h-[72px] mt-3 text-left text-[13px] leading-snug">
            {feedback && (
              <p>
                <span className={`font-semibold ${feedback.right ? "text-green-400" : feedback.half ? "text-amber-300" : "text-red-400"}`}>
                  {feedback.timedOut
                    ? "Out of time."
                    : feedback.right
                      ? "Correct."
                      : feedback.half
                        ? `Right to reject, wrong claim: it's ${current.flaw}.`
                        : current.flaw
                          ? `Not quite: reject on ${current.flaw}.`
                          : "Not quite: this one passes."}
                </span>{" "}
                <span className="text-slate-300">{current.tell}</span>
              </p>
            )}
          </div>

          {feedback ? (
            <button
              type="button"
              onClick={advance}
              className="mt-2 h-12 rounded-full bg-slate-100 text-slate-900 text-[14px] font-semibold hover:bg-white transition-colors cursor-pointer"
            >
              {index + 1 >= queue.length ? "See results →" : "Next token →"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => answer({ pass: false, key: current.lines[selected].key })}
                className="h-12 rounded-full bg-red-500/90 text-white text-[14px] font-semibold hover:bg-red-500 transition-colors cursor-pointer"
              >
                ← Reject: {current.lines[selected].key}
              </button>
              <button
                type="button"
                onClick={() => answer({ pass: true })}
                className="h-12 rounded-full bg-green-500/90 text-white text-[14px] font-semibold hover:bg-green-500 transition-colors cursor-pointer"
              >
                Pass →
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

export default TokenInspector;
