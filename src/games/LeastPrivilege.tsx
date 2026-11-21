"use client";

// Least Privilege: a puzzle rather than a reflex game. Each round is one
// role and a list of permissions; grant exactly what the job needs. Extra
// access and missing access both cost points, and the review screen explains
// every call. No timer, on purpose: this is the careful half of the job.
//
// All roles and systems are invented.

import { useState } from "react";
import { GameShell, useBestScore, type Phase } from "./GameShell";

type Permission = { label: string; need: boolean; why: string };
type Role = { title: string; duty: string; permissions: Permission[] };

const ROLES: Role[] = [
  {
    title: "Support Agent",
    duty: "Resolves customer tickets and issues small goodwill refunds.",
    permissions: [
      { label: "View customer profile", need: true, why: "Can't help someone without seeing their account." },
      { label: "Reply to tickets", need: true, why: "The core of the job." },
      { label: "Refunds up to $50", need: true, why: "Goodwill refunds are in the job description." },
      { label: "View ticket history", need: true, why: "Context from earlier conversations." },
      { label: "Unlimited refunds", need: false, why: "Large refunds belong with a supervisor." },
      { label: "Change customer email", need: false, why: "A direct route to account takeover. It belongs in a verified self-service flow." },
      { label: "Export all customer data", need: false, why: "Nothing about ticket work needs a bulk export." },
      { label: "Delete accounts", need: false, why: "Irreversible, and not a support decision." },
    ],
  },
  {
    title: "Accounts Payable Clerk",
    duty: "Pays invoices that someone else has already approved.",
    permissions: [
      { label: "View invoices", need: true, why: "Needed to process them." },
      { label: "Schedule payment of approved invoices", need: true, why: "This is the job." },
      { label: "View payment history", need: true, why: "Needed to answer vendor questions." },
      { label: "Approve invoices", need: false, why: "Separation of duties: the person paying shouldn't also approve." },
      { label: "Create vendors", need: false, why: "Creating a vendor and paying it's the classic fraud pairing." },
      { label: "Edit vendor bank details", need: false, why: "The single most abused permission in payment fraud." },
      { label: "Void payments", need: false, why: "Reversals need a second pair of eyes." },
      { label: "Export general ledger", need: false, why: "Not needed to pay invoices." },
    ],
  },
  {
    title: "Deployment Pipeline",
    duty: "A machine identity that builds and deploys one service.",
    permissions: [
      { label: "Read its own repository", need: true, why: "It has to fetch the code it builds." },
      { label: "Push images to its registry", need: true, why: "Publishing the build is part of the job." },
      { label: "Deploy its own service", need: true, why: "The last step of the pipeline." },
      { label: "Read its own production secret", need: true, why: "The service needs its credential at deploy time." },
      { label: "Read every repository", need: false, why: "One compromised pipeline shouldn't expose all your code." },
      { label: "Cloud account admin", need: false, why: "Turns a build bug into a full account compromise." },
      { label: "Manage IAM roles", need: false, why: "A pipeline that can grant itself access has no ceiling." },
      { label: "Read all production secrets", need: false, why: "Only its own service's secret is needed." },
    ],
  },
  {
    title: "Travel Booking Agent",
    duty: "An AI agent that books trips for employees within policy.",
    permissions: [
      { label: "Read the traveler's calendar", need: true, why: "To pick dates that work." },
      { label: "Search flights and hotels", need: true, why: "Its whole purpose." },
      { label: "Book within travel policy", need: true, why: "A capped, policy-bound authority to spend." },
      { label: "Read the traveler's travel profile", need: true, why: "Seat, loyalty numbers and preferences." },
      { label: "Spend without a limit", need: false, why: "An agent's authority should have a ceiling." },
      { label: "Read every employee's mailbox", need: false, why: "It needs one traveler's context, not the company's inbox." },
      { label: "Store passport data permanently", need: false, why: "Keep sensitive data only as long as the booking needs it." },
      { label: "Reset the traveler's password", need: false, why: "Nothing about booking travel needs control of the account." },
    ],
  },
];

const MAX = 100;
const MISSING_COST = 20;
const EXCESS_COST = 15;

function scoreRole(role: Role, granted: Set<number>) {
  let missing = 0;
  let excess = 0;
  role.permissions.forEach((p, i) => {
    if (p.need && !granted.has(i)) missing++;
    if (!p.need && granted.has(i)) excess++;
  });
  return { missing, excess, points: Math.max(0, MAX - missing * MISSING_COST - excess * EXCESS_COST) };
}

export function LeastPrivilege() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [granted, setGranted] = useState<Set<number>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const [total, setTotal] = useState(0);
  const [perfect, setPerfect] = useState(0);
  const [best, recordBest] = useBestScore("least-privilege-best");

  const role = ROLES[round];
  const result = reviewing ? scoreRole(role, granted) : null;

  const start = () => {
    setRound(0);
    setGranted(new Set());
    setReviewing(false);
    setTotal(0);
    setPerfect(0);
    setPhase("running");
  };

  const toggle = (i: number) => {
    if (reviewing) return;
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submit = () => {
    const r = scoreRole(role, granted);
    setTotal((t) => t + r.points);
    if (r.points === MAX) setPerfect((n) => n + 1);
    setReviewing(true);
  };

  const next = () => {
    if (round + 1 >= ROLES.length) {
      recordBest(total);
      setPhase("over");
      return;
    }
    setRound((n) => n + 1);
    setGranted(new Set());
    setReviewing(false);
  };

  return (
    <GameShell
      label="Least Privilege game"
      title="Least Privilege"
      phase={phase}
      best={best}
      onStart={start}
      intro={
        <>
          Four roles, four access requests. Grant exactly what each job needs. Every extra
          permission costs {EXCESS_COST} points, and every missing one costs {MISSING_COST}. No
          timer: take your time.
        </>
      }
      result={
        <>
          <p className="wordmark normal-case text-2xl text-concrete">Least privilege achieved?</p>
          <p className="text-concrete/70 text-sm">
            Score: <span className="text-concrete">{total}</span> of {ROLES.length * MAX}
            {best > 0 && (
              <>
                {" · "}Best: <span className="text-concrete">{best}</span>
              </>
            )}
          </p>
          <p className="text-concrete/55 text-xs">
            {perfect} of {ROLES.length} roles scoped exactly right
          </p>
        </>
      }
    >
      {phase !== "idle" && role && (
        <div className="absolute inset-0 flex flex-col p-5">
          <div className="flex items-center justify-between font-mono text-[13px] font-bold text-slate-200/90">
            <span>SCORE {total}</span>
            <span>
              ROLE {round + 1}/{ROLES.length}
            </span>
          </div>

          <div className="mt-4 text-left">
            <p className="text-[20px] font-semibold text-slate-100">{role.title}</p>
            <p className="text-[14px] leading-snug text-slate-400">{role.duty}</p>
          </div>

          <ul className="mt-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
            {role.permissions.map((p, i) => {
              const on = granted.has(i);
              const verdict = !reviewing
                ? null
                : p.need && on
                  ? { tone: "text-green-400", mark: "✓", text: "Needed" }
                  : !p.need && !on
                    ? { tone: "text-green-400", mark: "✓", text: "Correctly withheld" }
                    : p.need
                      ? { tone: "text-amber-300", mark: "!", text: "Missing" }
                      : { tone: "text-red-400", mark: "✕", text: "Excess" };
              return (
                <li key={p.label}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(i)}
                    disabled={reviewing}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                      on
                        ? "border-sky-400/70 bg-sky-400/10"
                        : "border-slate-700/70 bg-slate-800/50 hover:border-slate-500"
                    } ${reviewing ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`grid place-items-center size-5 shrink-0 rounded border text-[12px] ${
                          on ? "border-sky-400 bg-sky-400 text-slate-900" : "border-slate-500"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="flex-1 text-[14px] text-slate-100">{p.label}</span>
                      {verdict && (
                        <span className={`font-mono text-[11px] font-bold ${verdict.tone}`}>
                          {verdict.mark} {verdict.text}
                        </span>
                      )}
                    </span>
                    {reviewing && verdict && verdict.mark !== "✓" && (
                      <span className="block mt-1.5 pl-8 text-[12px] leading-snug text-slate-400">{p.why}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div aria-live="polite" className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate-300 text-left">
              {result
                ? result.points === MAX
                  ? "Exactly right. +100"
                  : `${result.excess} excess, ${result.missing} missing. +${result.points}`
                : `${granted.size} granted`}
            </p>
            <button
              type="button"
              onClick={reviewing ? next : submit}
              className="h-11 shrink-0 rounded-full bg-slate-100 px-5 text-[14px] font-semibold text-slate-900 hover:bg-white transition-colors cursor-pointer"
            >
              {reviewing ? (round + 1 >= ROLES.length ? "See results" : "Next role") : "Grant access"}
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}

export default LeastPrivilege;
