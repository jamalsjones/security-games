"use client";

// Firewall — a tiny arcade game about access control.
// Red packets are threats: block them with the paddle.
// Green packets are legitimate users: let them through to the bottom.
// Blocking a user or missing a threat costs a life.

import { useEffect, useRef, useState } from "react";

const W = 480;
const H = 600;

type Packet = {
  x: number;
  y: number;
  vy: number;
  bad: boolean;
  size: number;
};

export function FirewallGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const state = useRef({
    paddleX: W / 2,
    packets: [] as Packet[],
    lives: 3,
    score: 0,
    speed: 1,
    lastSpawn: 0,
    raf: 0,
    running: false,
  });

  useEffect(() => {
    // Read after mount, not via lazy initial state: localStorage is unavailable
    // during SSR, so initializing from it would cause a hydration mismatch.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBest(Number(localStorage.getItem("firewall-best") ?? 0));
    } catch {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = state.current;

    const movePaddle = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      s.paddleX = Math.max(50, Math.min(W - 50, x));
    };

    const onMouse = (e: MouseEvent) => movePaddle(e.clientX);
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        movePaddle(e.touches[0].clientX);
        if (s.running) e.preventDefault();
      }
    };
    const keys = { left: false, right: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
      if (["ArrowLeft", "ArrowRight"].includes(e.key) && s.running) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
    };

    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;

      if (s.running) {
        // Keyboard movement
        if (keys.left) s.paddleX = Math.max(50, s.paddleX - 7 * dt);
        if (keys.right) s.paddleX = Math.min(W - 50, s.paddleX + 7 * dt);

        // Spawn packets
        s.lastSpawn += dt * 16.67;
        const interval = Math.max(900 - s.score * 6, 380);
        if (s.lastSpawn > interval) {
          s.lastSpawn = 0;
          s.packets.push({
            x: 30 + Math.random() * (W - 60),
            y: -20,
            vy: (1.6 + Math.random() * 1.2) * s.speed,
            bad: Math.random() < 0.55,
            size: 16,
          });
        }

        // Update packets
        const paddleTop = H - 46;
        for (let i = s.packets.length - 1; i >= 0; i--) {
          const p = s.packets[i];
          p.y += p.vy * dt * 2.2;

          const hitPaddle =
            p.y + p.size > paddleTop &&
            p.y < paddleTop + 14 &&
            p.x + p.size > s.paddleX - 50 &&
            p.x - p.size < s.paddleX + 50;

          if (hitPaddle) {
            s.packets.splice(i, 1);
            if (p.bad) {
              s.score += 10; // threat blocked
            } else {
              s.lives -= 1; // blocked a legitimate user
            }
            continue;
          }

          if (p.y > H + 20) {
            s.packets.splice(i, 1);
            if (p.bad) {
              s.lives -= 1; // threat got through
            } else {
              s.score += 5; // user got through
            }
          }
        }

        s.speed = 1 + s.score / 200;

        if (s.lives <= 0) {
          s.running = false;
          setScore(s.score);
          setPhase("over");
          try {
            const prev = Number(localStorage.getItem("firewall-best") ?? 0);
            if (s.score > prev) {
              localStorage.setItem("firewall-best", String(s.score));
              setBest(s.score);
            }
          } catch {}
        }
      }

      // ---- Draw ----
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      // Grid backdrop
      ctx.strokeStyle = "rgba(148,163,184,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Packets
      for (const p of s.packets) {
        ctx.fillStyle = p.bad ? "#ef4444" : "#22c55e";
        ctx.beginPath();
        ctx.roundRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, 4);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.bad ? "✕" : "✓", p.x, p.y + 3.5);
      }

      // Paddle (the firewall)
      const grad = ctx.createLinearGradient(s.paddleX - 50, 0, s.paddleX + 50, 0);
      grad.addColorStop(0, "#f97316");
      grad.addColorStop(1, "#fb923c");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(s.paddleX - 50, H - 46, 100, 12, 6);
      ctx.fill();

      // HUD
      ctx.fillStyle = "rgba(248,250,252,0.9)";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE ${s.score}`, 14, 24);
      ctx.textAlign = "right";
      ctx.fillText(`LIVES ${"●".repeat(Math.max(s.lives, 0))}`, W - 14, 24);

      s.raf = requestAnimationFrame(loop);
    };

    s.raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(s.raf);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchstart", onTouch);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const start = () => {
    const s = state.current;
    s.packets = [];
    s.lives = 3;
    s.score = 0;
    s.speed = 1;
    s.lastSpawn = 0;
    s.running = true;
    setPhase("running");
  };

  return (
    <div className="relative w-full max-w-[480px] mx-auto select-none">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full h-auto rounded-2xl border border-graphite/15"
        aria-label="Firewall arcade game"
      />

      {phase !== "running" && (
        <div className="absolute inset-0 rounded-2xl bg-carbon/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-8 text-center">
          {phase === "over" ? (
            <>
              <p className="wordmark normal-case text-2xl text-concrete">Access review complete</p>
              <p className="text-concrete/70 text-sm">
                Score: <span className="text-concrete">{score}</span>
                {best > 0 && (
                  <>
                    {" · "}Best: <span className="text-concrete">{best}</span>
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="wordmark normal-case text-2xl text-concrete">Firewall</p>
              <p className="text-concrete/70 text-sm leading-relaxed max-w-xs">
                Block the <span className="text-red-400 font-semibold">red threats</span>. Let the{" "}
                <span className="text-green-400 font-semibold">green users</span> through.
                Move with arrow keys, mouse, or touch.
              </p>
              {best > 0 && (
                <p className="text-concrete/45 text-xs">Personal best: {best}</p>
              )}
            </>
          )}
          <button
            onClick={start}
            className="pill-light mt-2 cursor-pointer"
          >
            {phase === "over" ? "Run it back" : "Start"}
          </button>
        </div>
      )}
    </div>
  );
}

export default FirewallGame;
