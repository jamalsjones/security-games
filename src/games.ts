// The games and the copy shown beside each one. The first four also live on
// jamalsjones.com/off-the-clock; Fernway is a standalone page in public/fernway/.

export type GameId =
  | "firewall"
  | "phish-or-legit"
  | "least-privilege"
  | "token-inspector"
  | "fernway";

export type Game = {
  id: GameId;
  title: string;
  tagline: string;
  description: string;
  note: string;
};

export const games: Game[] = [
  {
    id: "firewall",
    title: "Firewall",
    tagline: "Pong meets IAM policy.",
    description:
      "Packets fall from the top of the screen. Red ones are threats — block them. Green ones are legitimate users — get out of their way. Block a user or miss a threat and you lose a life. Arrow keys, mouse, or touch. It gets faster.",
    note: "A <canvas>, requestAnimationFrame, and no dependencies — the whole game is one component.",
  },
  {
    id: "phish-or-legit",
    title: "Phish or Legit",
    tagline: "Your inbox, against the clock.",
    description:
      "Ten messages, twenty seconds each. Call every one phishing or legitimate, then read the tell either way: lookalike domains, subdomain tricks, MFA fatigue, QR codes, and the executive who needs a quick favor. Arrow keys or tap.",
    note: "Every company, person and domain in the deck is invented.",
  },
  {
    id: "least-privilege",
    title: "Least Privilege",
    tagline: "Grant exactly enough.",
    description:
      "Four roles, from a support agent to a deployment pipeline to an AI agent that books travel. Pick the permissions each one needs. Extra access and missing access both cost points, and the review explains every call. No timer.",
    note: "The slow, careful half of identity work.",
  },
  {
    id: "token-inspector",
    title: "Token Inspector",
    tagline: "You're the API. Check the token.",
    description:
      "Access tokens arrive decoded, ten to a shift. Pass the good ones, or point at the claim that sinks a bad one: an expired exp, the wrong audience, a lookalike issuer, alg none, a swapped algorithm, a key fetched from the wrong place. Rejecting for the wrong reason only half counts. Tap or arrow keys.",
    note: "The checks follow RFC 7519, RFC 8725 and RFC 9068. Northpeak and its API are invented.",
  },
  {
    id: "fernway",
    title: "Fernway",
    tagline: "Your first day, one stop at a time.",
    description:
      "A new hire's day one as a walk across a small 3D campus: badge at the front desk, laptop and two-step sign-in at the IT bar, then the desk, the team, lunch, a first one-to-one and a first small change. Each stop has a few things to tick off. Click a pin to jump, or use the arrow keys.",
    note: "The joiner side of identity, seen from the new hire's chair. Three.js on a single HTML page; Fernway and everyone in it are invented.",
  },
];
