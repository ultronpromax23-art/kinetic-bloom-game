import { useEffect, useState } from "react";
import { useMultiplayer } from "../../game/multiplayer";
import { useGame } from "../../game/store";

function Field({
  label,
  value,
  placeholder,
  maxLength,
  uppercase,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  uppercase?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        className={`mt-2 w-full rounded-sm border border-hud-dim/25 bg-black/40 px-4 py-3 text-sm font-bold uppercase text-hud-fg outline-none transition-colors placeholder:text-hud-dim/50 focus:border-hud-accent ${
          uppercase ? "tracking-[0.5em]" : "tracking-[0.18em]"
        }`}
      />
    </label>
  );
}

export function Lobby({ onDeploy }: { onDeploy: () => void }) {
  const {
    room,
    players,
    selfId,
    connecting,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    clearError,
  } = useMultiplayer();
  const start = useGame((s) => s.start);

  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const self = players.find((p) => p.id === selfId);
  const isHost = !!self?.is_host;

  // Everyone in the room drops into the arena the moment the host starts.
  useEffect(() => {
    if (room?.status === "playing") {
      start("combat");
      onDeploy();
    }
  }, [room?.status, start, onDeploy]);

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!room) {
    return (
      <div className="max-w-xl space-y-6">
        <p className="text-sm leading-relaxed text-hud-dim">
          Host a private match and share the four-letter code, or drop into a friend&apos;s lobby.
          Scores and positions sync live for everyone in the room.
        </p>

        <Field
          label="Callsign"
          value={username}
          placeholder="Operator"
          maxLength={16}
          onChange={(v) => {
            clearError();
            setUsername(v);
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            disabled={connecting}
            onClick={() => createRoom(username)}
            className="rounded-sm border border-hud-accent bg-hud-accent/25 py-4 text-[11px] font-bold uppercase tracking-[0.3em] text-hud-fg transition-colors hover:bg-hud-accent/45 disabled:opacity-50"
          >
            {connecting ? "Opening…" : "Host Match"}
          </button>

          <div className="space-y-2">
            <Field
              label="Room Code"
              value={code}
              placeholder="ABCD"
              maxLength={4}
              uppercase
              onChange={(v) => {
                clearError();
                setCode(v);
              }}
            />
            <button
              disabled={connecting || code.length !== 4}
              onClick={() => joinRoom(code, username)}
              className="w-full rounded-sm border border-hud-armor bg-hud-armor/20 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-hud-fg transition-colors hover:bg-hud-armor/40 disabled:opacity-40"
            >
              Join Match
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-sm border border-hud-health/50 bg-hud-health/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-hud-health">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-sm border border-hud-dim/20 bg-black/35 px-5 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">Room Code</div>
          <div className="mt-1 text-4xl font-black tracking-[0.35em] text-hud-accent">
            {room.room_code}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">
            {room.status === "waiting" ? "Waiting for players" : room.status}
          </span>
          <button
            onClick={copyCode}
            className="rounded-sm border border-hud-dim/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-hud-dim transition-colors hover:border-hud-accent hover:text-hud-fg"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.3em] text-hud-accent">
            Squad — {players.length}
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">Live</span>
        </div>
        <div className="space-y-2">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-sm border px-4 py-3 ${
                p.id === selfId
                  ? "border-hud-accent bg-hud-accent/15"
                  : "border-hud-dim/20 bg-black/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-hud-scope" />
                <span className="text-sm font-bold uppercase tracking-[0.18em] text-hud-fg">
                  {p.username}
                </span>
                {p.is_host && (
                  <span className="rounded-sm bg-hud-accent/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-hud-fg">
                    Host
                  </span>
                )}
                {p.id === selfId && (
                  <span className="text-[10px] uppercase tracking-[0.28em] text-hud-dim">You</span>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums text-hud-dim">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-sm border border-hud-health/50 bg-hud-health/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-hud-health">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {isHost ? (
          <button
            onClick={startGame}
            className="flex-1 rounded-sm border border-hud-accent bg-hud-accent/25 py-4 text-[11px] font-bold uppercase tracking-[0.32em] text-hud-fg transition-colors hover:bg-hud-accent/45"
          >
            Start Game
          </button>
        ) : (
          <div className="flex-1 rounded-sm border border-hud-dim/25 bg-black/30 py-4 text-center text-[11px] font-bold uppercase tracking-[0.32em] text-hud-dim">
            Waiting for host…
          </div>
        )}
        <button
          onClick={leaveRoom}
          className="rounded-sm border border-hud-health/60 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-hud-health transition-colors hover:bg-hud-health/20"
        >
          {isHost ? "Close Lobby" : "Leave"}
        </button>
      </div>
    </div>
  );
}
