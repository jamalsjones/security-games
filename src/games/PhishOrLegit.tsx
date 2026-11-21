"use client";

// Phish or Legit: messages land one at a time, and each has to be called
// before its timer runs out. Every call reveals the tell, because the point
// is learning to spot it, not just racking up a score.
//
// Every company, person and domain in the deck is invented. Northpeak is the
// player's employer, and its real domain is northpeak.com.

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, TimerBar, shuffle, useBestScore, type Phase } from "./GameShell";

type Message = {
  from: string;
  address: string;
  subject: string;
  body: string;
  link?: string;
  phish: boolean;
  tell: string;
};

const DECK: Message[] = [
  {
    from: "IT Service Desk",
    address: "helpdesk@northpeak-support.co",
    subject: "Your password expires in 2 hours",
    body: "Reset it now to avoid losing access to email and payroll.",
    link: "https://northpeak-support.co/reset",
    phish: true,
    tell: "A lookalike domain. Northpeak's is northpeak.com, and the deadline is there to rush you.",
  },
  {
    from: "Ledgerline Payroll",
    address: "payroll@ledgerline-hr.net",
    subject: "Confirm your direct deposit before Friday",
    body: "We're migrating accounts. Re-enter your bank details to keep getting paid.",
    link: "https://ledgerline-hr.net/verify",
    phish: true,
    tell: "Bank details requested through an emailed link, from a domain you've never seen: payroll diversion.",
  },
  {
    from: "Cobalt Bank",
    address: "alerts@cobaIt-bank.com",
    subject: "Unusual sign-in blocked",
    body: "Verify your identity within 24 hours or your card will be frozen.",
    link: "https://cobaIt-bank.com/secure",
    phish: true,
    tell: "Look closely at the domain: that's a capital I standing in for the l.",
  },
  {
    from: "Driftbox",
    address: "no-reply@driftbox.com.share-files.io",
    subject: "Q3 board deck shared with you",
    body: "Sign in to view the document.",
    link: "https://driftbox.com.share-files.io/view",
    phish: true,
    tell: "Read domains from the right. This one is share-files.io; driftbox.com is just a label in front of it.",
  },
  {
    from: "Dana Reyes",
    address: "dana.reyes.ceo@gmail.com",
    subject: "Quick favor, are you at your desk?",
    body: "I'm in back-to-back meetings and need something handled discreetly. Reply when you see this.",
    phish: true,
    tell: "An executive's name on a personal webmail account with a vague, urgent ask. Gift card fraud starts like this.",
  },
  {
    from: "Parcelwise",
    address: "track@parcelwise-delivery.info",
    subject: "Delivery failed: $1.99 redelivery fee",
    body: "Pay the fee to reschedule your package.",
    link: "https://parcelwise-delivery.info/pay",
    phish: true,
    tell: "A tiny fee, an unfamiliar domain and a payment page. The small amount is what makes people skip checking.",
  },
  {
    from: "Northpeak SSO",
    address: "sso@northpeak.com",
    subject: "Approve the sign-in request on your phone",
    body: "You'll get several prompts. Approve them to avoid being locked out.",
    phish: true,
    tell: "The sender can be spoofed, but the ask gives it away: nobody legitimate wants you to approve a sign-in you didn't start.",
  },
  {
    from: "Northpeak IT",
    address: "it@northpeak.com",
    subject: "Action required: re-enroll your MFA",
    body: "Scan the QR code in the attachment with your phone to keep access.",
    phish: true,
    tell: "QR codes hide where they go, which is exactly why phishers use them to get past link scanning.",
  },
  {
    from: "Accounts Receivable",
    address: "billing@sterling-supply.com",
    subject: "Invoice 88213 is overdue",
    body: "Open the attached Invoice_88213.html to view and pay.",
    phish: true,
    tell: "An .html attachment opens a phishing page on your own machine, where link scanners can't see it.",
  },
  {
    from: "Mail Admin",
    address: "admin@northpeak.mail-quota.com",
    subject: "Your mailbox is 98% full",
    body: "Messages will bounce. Sign in to increase your storage.",
    link: "https://northpeak.mail-quota.com/login",
    phish: true,
    tell: "The real domain is mail-quota.com. Putting northpeak first is meant to catch a skim read.",
  },
  {
    from: "Northpeak IT",
    address: "it@northpeak.com",
    subject: "Scheduled maintenance Saturday, 2am to 4am",
    body: "Email may be briefly unavailable. No action needed.",
    phish: false,
    tell: "Internal domain, no link, and it asks for nothing.",
  },
  {
    from: "Ledgerline",
    address: "statements@ledgerline.com",
    subject: "Your pay statement is ready",
    body: "View it in the Ledgerline app or at the address you normally use.",
    phish: false,
    tell: "The exact domain, and it points you to the place you already sign in rather than a link.",
  },
  {
    from: "Cobalt Bank",
    address: "alerts@cobaltbank.com",
    subject: "You added a new payee",
    body: "If this wasn't you, call the number on the back of your card.",
    phish: false,
    tell: "It sends you to a channel you already trust instead of asking you to click.",
  },
  {
    from: "Driftbox",
    address: "no-reply@driftbox.com",
    subject: "Priya Shah shared \"Onboarding checklist\" with you",
    body: "Priya is your new manager. She mentioned this in yesterday's call.",
    link: "https://driftbox.com/s/onboarding",
    phish: false,
    tell: "Real domain, a colleague you expect to hear from, and a file that fits the context.",
  },
  {
    from: "Parcelwise",
    address: "updates@parcelwise.com",
    subject: "Your package arrives tomorrow",
    body: "Track it in your Parcelwise account.",
    phish: false,
    tell: "The exact domain, no payment, no urgency.",
  },
  {
    from: "Maya Chen",
    address: "maya.chen@northpeak.com",
    subject: "Invite: access review kickoff, Tuesday 10:00",
    body: "Thirty minutes to agree scope for this quarter's certification.",
    phish: false,
    tell: "An internal sender and an ordinary meeting invite with nothing to enter.",
  },
  {
    from: "Northpeak SSO",
    address: "sso@northpeak.com",
    subject: "A security key was added to your account",
    body: "If you didn't do this, contact the service desk through the intranet.",
    phish: false,
    tell: "A notice after the fact that points you to a known internal channel.",
  },
  {
    from: "Northpeak People Team",
    address: "people@northpeak.com",
    subject: "Benefits enrollment closes November 15",
    body: "Make your selections in the benefits portal on the intranet.",
    phish: false,
    tell: "Expected, seasonal, internal, and it sends you somewhere you already know.",
  },
];

const ROUND = 10;
// Each message has a sender, an address, a subject, a body and sometimes a
// link to inspect, so ten seconds was a race to click rather than a read.
const SECONDS = 20;
// The tell stays up long enough to read; "Next message" skips ahead.
const FEEDBACK_MS = 6000;

export function PhishOrLegit() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<Message[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [feedback, setFeedback] = useState<null | { right: boolean; timedOut: boolean }>(null);
  const [best, recordBest] = useBestScore("phish-or-legit-best");
  const scoreRef = useRef(0);

  const current = queue[index];

  const start = () => {
    setQueue(shuffle(DECK).slice(0, ROUND));
    setIndex(0);
    setScore(0);
    scoreRef.current = 0;
    setCorrect(0);
    setStreak(0);
    setTimeLeft(SECONDS);
    setFeedback(null);
    setPhase("running");
  };

  const answer = useCallback(
    (saysPhish: boolean | null) => {
      if (phase !== "running" || feedback || !current) return;
      const right = saysPhish !== null && saysPhish === current.phish;
      setFeedback({ right, timedOut: saysPhish === null });
      if (right) {
        // Speed and streaks both pay, but a correct slow answer still beats a fast wrong one.
        const gained = 10 + Math.ceil(timeLeft) + Math.min(streak, 5) * 2;
        scoreRef.current += gained;
        setScore(scoreRef.current);
        setCorrect((c) => c + 1);
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }
    },
    [phase, feedback, current, timeLeft, streak]
  );

  // Countdown. The state update happens inside the timeout, never synchronously in the effect.
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
      setTimeLeft(SECONDS);
    }
  }, [index, queue.length, recordBest]);

  // After each call, show the tell, then move on unless the player skips ahead.
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(advance, FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [feedback, advance]);

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (feedback) {
        if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          advance();
        }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "p") {
        e.preventDefault();
        answer(true);
      } else if (e.key === "ArrowRight" || e.key === "l") {
        e.preventDefault();
        answer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, answer, feedback, advance]);

  return (
    <GameShell
      label="Phish or Legit game"
      title="Phish or Legit"
      phase={phase}
      best={best}
      onStart={start}
      intro={
        <>
          Messages land one at a time. Call each one{" "}
          <span className="text-red-400 font-semibold">phish</span> or{" "}
          <span className="text-green-400 font-semibold">legit</span> before the timer runs out.
          Twenty seconds each. Tap the buttons or use the arrow keys.
        </>
      }
      result={
        <>
          <p className="wordmark normal-case text-2xl text-concrete">Inbox cleared</p>
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
        <div className="absolute inset-0 flex flex-col p-5">
          <div className="flex items-center justify-between font-mono text-[13px] font-bold text-slate-200/90">
            <span>SCORE {score}</span>
            <span>
              {index + 1}/{queue.length}
            </span>
          </div>
          <div className="mt-3">
            <TimerBar fraction={feedback ? 0 : timeLeft / SECONDS} />
          </div>

          <article className="mt-5 flex-1 min-h-0 overflow-y-auto rounded-xl bg-slate-800/70 border border-slate-700/60 p-4 text-left">
            <p className="text-[15px] font-semibold text-slate-100">{current.from}</p>
            <p className="font-mono text-[12px] text-slate-400 break-all">{current.address}</p>
            <p className="mt-3 text-[15px] text-slate-100">{current.subject}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-300">{current.body}</p>
            {current.link && (
              <p className="mt-3 font-mono text-[12px] text-sky-300 break-all underline decoration-sky-300/40">
                {current.link}
              </p>
            )}
          </article>

          <div aria-live="polite" className="min-h-[76px] mt-3 text-left text-[13px] leading-snug">
            {feedback && (
              <p>
                <span className={`font-semibold ${feedback.right ? "text-green-400" : "text-red-400"}`}>
                  {feedback.timedOut ? "Out of time." : feedback.right ? "Correct." : "Not quite."}{" "}
                  {current.phish ? "Phish." : "Legit."}
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
              {index + 1 >= queue.length ? "See results →" : "Next message →"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => answer(true)}
                className="h-12 rounded-full bg-red-500/90 text-white text-[14px] font-semibold hover:bg-red-500 transition-colors cursor-pointer"
              >
                ← Phish
              </button>
              <button
                type="button"
                onClick={() => answer(false)}
                className="h-12 rounded-full bg-green-500/90 text-white text-[14px] font-semibold hover:bg-green-500 transition-colors cursor-pointer"
              >
                Legit →
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

export default PhishOrLegit;
