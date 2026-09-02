import { useEffect, useRef, useState } from "react";
import { useGame } from "../../game/store";
import { WEAPONS, WEAPON_ORDER } from "../../game/weapons";
import { MainMenu } from "./MainMenu";
import { MultiplayerSync } from "./MultiplayerSync";
import { useMultiplayer } from "../../game/multiplayer";

function Bar({ value, max, tone }: { value: number; max: number; tone: "health" | "armor" }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className="h-2 w-40 overflow-hidden rounded-sm bg-hud-track">
      <div
        className={tone === "health" ? "h-full bg-hud-health" : "h-full bg-hud-armor"}
        style={{ width: `${pct}%`, transition: "width 120ms linear" }}
      />
    </div>
  );
}

export function HUD({ onResume }: { onResume: () => void }) {
  const {
    phase,
    health,
    armor,
    kills,
    score,
    deaths,
    current,
    ammo,
    reloading,
    ads,
    hitMarker,
    damageFlash,
    killFeed,
    start,
    respawn,
    toMenu,
  } = useGame();
  const room = useMultiplayer((s) => s.room);
  const roomPlayers = useMultiplayer((s) => s.players);
  const selfId = useMultiplayer((s) => s.selfId);
  const leaveRoom = useMultiplayer((s) => s.leaveRoom);
  const def = WEAPONS[current];
  const a = ammo[current];
  const [, tick] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const loop = () => {
      tick((n) => (n + 1) % 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const now = performance.now();
  const markerAge = now - hitMarker.at;
  const showMarker = markerAge < 220;
  const hurtAge = now - damageFlash;
  const hurt = Math.max(0, 1 - hurtAge / 500);
  const lowHealth = health < 35;
  const scoped = ads && def.scope;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-hud text-hud-fg">
      {/* damage vignette */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${120 + hurt * 160}px rgba(190,40,25,${hurt * 0.85 + (lowHealth ? 0.22 : 0)})`,
          transition: "box-shadow 90ms linear",
        }}
      />

      {/* sniper scope */}
      {scoped && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black" style={{ clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)", WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 0 31%, black 31.4%)", maskImage: "radial-gradient(circle at 50% 50%, transparent 0 31%, black 31.4%)" }} />
          <div className="absolute left-1/2 top-1/2 h-px w-[62vh] -translate-x-1/2 -translate-y-1/2 bg-hud-scope/70" />
          <div className="absolute left-1/2 top-1/2 h-[62vh] w-px -translate-x-1/2 -translate-y-1/2 bg-hud-scope/70" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud-scope" />
        </div>
      )}

      {/* crosshair */}
      {phase === "playing" && !scoped && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-8 w-8">
            <span className="absolute left-1/2 top-0 h-2.5 w-0.5 -translate-x-1/2 bg-hud-cross" />
            <span className="absolute bottom-0 left-1/2 h-2.5 w-0.5 -translate-x-1/2 bg-hud-cross" />
            <span className="absolute left-0 top-1/2 h-0.5 w-2.5 -translate-y-1/2 bg-hud-cross" />
            <span className="absolute right-0 top-1/2 h-0.5 w-2.5 -translate-y-1/2 bg-hud-cross" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud-cross" />
          </div>
        </div>
      )}

      {/* hit marker */}
      {showMarker && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: 1 - markerAge / 220 }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34">
            {[
              [6, 6, 12, 12],
              [28, 6, 22, 12],
              [6, 28, 12, 22],
              [28, 28, 22, 22],
            ].map(([x1, y1, x2, y2], i) => (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={hitMarker.kill ? 3.5 : 2.5}
                className={
                  hitMarker.kill
                    ? "stroke-hud-kill"
                    : hitMarker.head
                      ? "stroke-hud-head"
                      : "stroke-hud-cross"
                }
              />
            ))}
          </svg>
        </div>
      )}

      {/* bottom-left: vitals */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="w-10 text-xs tracking-[0.2em] text-hud-dim">HP</span>
          <Bar value={health} max={100} tone="health" />
          <span className="text-2xl font-bold tabular-nums">{Math.ceil(health)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-10 text-xs tracking-[0.2em] text-hud-dim">ARM</span>
          <Bar value={armor} max={100} tone="armor" />
          <span className="text-lg font-semibold tabular-nums text-hud-armor">
            {Math.ceil(armor)}
          </span>
        </div>
      </div>

      {/* bottom-right: ammo + weapons */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
        <div className="text-xs uppercase tracking-[0.3em] text-hud-dim">{def.name}</div>
        <div className="flex items-end gap-2">
          <span
            className={`text-5xl font-bold tabular-nums ${a.mag === 0 ? "text-hud-health" : ""}`}
          >
            {a.mag}
          </span>
          <span className="pb-1 text-xl tabular-nums text-hud-dim">/ {a.reserve}</span>
        </div>
        {reloading && (
          <div className="text-sm uppercase tracking-[0.3em] text-hud-armor">Reloading…</div>
        )}
        <div className="mt-1 flex gap-1.5">
          {WEAPON_ORDER.map((id, i) => (
            <div
              key={id}
              className={`rounded-sm border px-2 py-1 text-[11px] tracking-widest ${
                id === current
                  ? "border-hud-accent bg-hud-accent/20 text-hud-fg"
                  : "border-hud-dim/40 text-hud-dim"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* top-left: score */}
      <div className="absolute left-6 top-6 flex flex-col gap-1 text-sm tracking-[0.2em]">
        <div className="text-hud-dim">
          KILLS <span className="text-xl font-bold text-hud-fg">{kills}</span>
        </div>
        <div className="text-hud-dim">
          SCORE <span className="text-xl font-bold text-hud-accent">{score}</span>
        </div>
        <div className="text-hud-dim">
          DEATHS <span className="font-bold text-hud-fg">{deaths}</span>
        </div>
      </div>

      {/* menu button */}
      <button
        className="pointer-events-auto absolute right-6 top-6 rounded-sm border border-hud-dim/40 bg-black/50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-hud-fg transition-colors hover:border-hud-accent hover:text-hud-accent"
        onClick={() => {
          if (document.pointerLockElement) document.exitPointerLock();
          toMenu();
        }}
      >
        Menu
      </button>

      {/* stop multiplayer */}
      {room && (
        <button
          className="pointer-events-auto absolute right-6 top-[4.25rem] rounded-sm border border-hud-health/60 bg-black/50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-hud-health transition-colors hover:border-hud-health hover:bg-hud-health/20"
          onClick={() => void leaveRoom()}
        >
          Stop MP
        </button>
      )}

      <MultiplayerSync />

      {/* live room scoreboard */}
      {room && phase === "playing" && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-sm border border-hud-dim/25 bg-black/45 px-4 py-2">
          <div className="text-center text-[10px] uppercase tracking-[0.3em] text-hud-dim">
            Room {room.room_code}
          </div>
          <div className="mt-1 flex gap-4">
            {roomPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs tracking-widest">
                <span className={p.id === selfId ? "text-hud-accent" : "text-hud-dim"}>
                  {p.username}
                </span>
                <span className="font-bold tabular-nums text-hud-fg">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* kill feed */}
      <div className="absolute right-6 top-16 flex flex-col items-end gap-1">
        {killFeed.map((f) => (
          <div
            key={f.id}
            className="rounded-sm border border-hud-dim/30 bg-black/40 px-2 py-1 text-xs tracking-widest"
          >
            YOU <span className="text-hud-accent">{f.head ? "✦ HEADSHOT" : "▸"}</span> {f.text}
          </div>
        ))}
      </div>

      {/* main menu */}
      {phase === "menu" && <MainMenu onDeploy={onResume} />}

      {/* death overlay */}
      {phase === "dead" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/72 backdrop-blur-sm">
          <div className="max-w-lg px-8 text-center">
            <h1 className="text-5xl font-black uppercase tracking-[0.14em] text-hud-accent">
              {phase === "dead" ? "You were terminated" : "Dust Protocol"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed tracking-wide text-hud-dim">
              {phase === "dead"
                ? `Kills: ${kills} · Score: ${score}. Respawn and clear the yard.`
                : "Hold the scrapyard against the sentinel line. Five weapons, no cover you can trust."}
            </p>

            <div className="mx-auto mt-6 grid grid-cols-2 gap-x-8 gap-y-1 text-left text-xs tracking-widest text-hud-dim">
              <span>WASD — Move</span>
              <span>Mouse — Aim</span>
              <span>L-Click — Fire</span>
              <span>R-Click — Aim down sights</span>
              <span>Space — Jump</span>
              <span>Shift — Sprint</span>
              <span>Ctrl — Crouch</span>
              <span>R — Reload</span>
              <span>1-5 — Weapons</span>
              <span>Esc — Release cursor</span>
            </div>

            <button
              className="mt-8 rounded-sm border border-hud-accent bg-hud-accent/20 px-8 py-3 text-sm font-bold uppercase tracking-[0.3em] text-hud-fg transition-colors hover:bg-hud-accent/40"
              onClick={() => {
                if (phase === "dead") respawn();
                else start();
                onResume();
              }}
            >
              {phase === "dead" ? "Respawn" : "Deploy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
