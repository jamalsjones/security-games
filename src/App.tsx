import { useState, type ComponentType } from "react";
import { games, type GameId } from "./games";
import { FirewallGame } from "./games/FirewallGame";
import { PhishOrLegit } from "./games/PhishOrLegit";
import { LeastPrivilege } from "./games/LeastPrivilege";
import { TokenInspector } from "./games/TokenInspector";

const SITE = "https://www.jamalsjones.com";
const FERNWAY_URL = `${import.meta.env.BASE_URL}fernway/`;

const BOARDS: Partial<Record<GameId, ComponentType>> = {
  firewall: FirewallGame,
  "phish-or-legit": PhishOrLegit,
  "least-privilege": LeastPrivilege,
  "token-inspector": TokenInspector,
};

function FernwayBoard() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto overflow-hidden rounded-2xl bg-[#B9DCEB] aspect-[4/5] flex flex-col items-center justify-center gap-5 p-8 text-center text-[#1E2B3A]">
      <p className="text-sm font-semibold tracking-wide text-[#3E6E8E]">Fernway</p>
      <p className="wordmark normal-case text-4xl">Your first day</p>
      <p className="text-sm leading-relaxed max-w-xs opacity-80">
        A full-screen 3D walk from the front desk to the garden gate.
      </p>
      <a href={FERNWAY_URL} className="pill-dark mt-2">
        Start your day
      </a>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState<GameId>(games[0].id);
  const game = games.find((g) => g.id === active) ?? games[0];
  const Board = BOARDS[game.id] ?? FernwayBoard;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-8 py-12 md:py-20">
      <header className="flex flex-col gap-4 border-b border-graphite/25 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="label text-graphite/55">Play</p>
          <h1 className="wordmark normal-case text-[40px] md:text-[56px] leading-none text-graphite">
            Security games
          </h1>
        </div>
        <p className="text-[15px] leading-relaxed text-graphite/65 max-w-md">
          Small browser games about access control and identity, built because the metaphors were
          too good to leave alone. By{" "}
          <a href={SITE} className="underline underline-offset-4 hover:text-graphite">
            Jamal Jones
          </a>
          .
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 mt-8" aria-label="Games">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g.id)}
            aria-pressed={g.id === game.id}
            className={g.id === game.id ? "pill-dark" : "pill-outline"}
          >
            {g.title}
          </button>
        ))}
      </nav>

      <section className="panel grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mt-6 p-6 md:p-10 items-center">
        <div className="lg:col-span-5">
          <Board key={game.id} />
        </div>
        <div className="lg:col-span-7">
          <p className="label text-graphite/45">{game.title}</p>
          <p className="statement text-[19px] md:text-[24px] text-graphite/80 mt-3">{game.tagline}</p>
          <p className="text-[15px] leading-relaxed text-graphite/65 mt-6 max-w-lg">{game.description}</p>
          <p className="text-[13px] leading-relaxed text-graphite/45 mt-5 max-w-lg">{game.note}</p>
        </div>
      </section>

      <footer className="mt-12 flex flex-col gap-2 text-[13px] text-graphite/55 sm:flex-row sm:justify-between">
        <p>
          More of my work at{" "}
          <a href={SITE} className="underline underline-offset-4 hover:text-graphite">
            jamalsjones.com
          </a>
        </p>
        <p>
          <a
            href="https://github.com/jamalsjones/security-games"
            className="underline underline-offset-4 hover:text-graphite"
          >
            Source on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
