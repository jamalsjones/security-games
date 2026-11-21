# Security games

Small browser games about access control and identity, built because the metaphors were too good to leave alone.

**[Play them here](https://jamalsjones.github.io/security-games/)**, or on [jamalsjones.com](https://www.jamalsjones.com/off-the-clock#play).

| Game | What it teaches |
|---|---|
| **Firewall** | Pong meets IAM policy. Block the red threats, let the green users through, and don't get it backwards. |
| **Phish or Legit** | Ten messages, twenty seconds each. Lookalike domains, subdomain tricks, MFA fatigue, QR codes and the executive who needs a quick favor. |
| **Least Privilege** | Grant each role exactly what it needs, from a support agent to a deployment pipeline to an AI agent that books travel. Extra access and missing access both cost points. |
| **Token Inspector** | You're the API. Pass good access tokens, or point at the claim that sinks a bad one. The checks follow RFC 7519, RFC 8725 and RFC 9068. |
| **Fernway** | A new hire's first day as a walk across a small 3D campus, from badge pickup and two-step sign-in to a first small change. |

Every company, person and domain in the games is invented.

## How it's built

- The first four are React components, one file each, in [`src/games/`](src/games). Firewall draws on a `<canvas>`; the others share a small frame in [`GameShell.tsx`](src/games/GameShell.tsx).
- Fernway is a single HTML page using Three.js, in [`public/fernway/`](public/fernway/index.html).
- No backend, no accounts and no tracking. Personal bests and Fernway's checklist are kept in your own browser's local storage.
- Built with Vite, React 19, TypeScript and Tailwind CSS.

## Run it locally

```bash
npm install
npm run dev
```

## Author

Jamal Jones · [jamalsjones.com](https://www.jamalsjones.com) · [LinkedIn](https://www.linkedin.com/in/jamalsjones)
