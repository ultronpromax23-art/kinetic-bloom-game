import { useState } from "react";
import {
  Home,
  Volume2,
  Music,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  Menu as MenuIcon,
  BarChart3,
  Skull,
  X,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  useGame,
  type Settings,
} from "../../game/store";
import { WEAPONS, WEAPON_ORDER, type WeaponId } from "../../game/weapons";
import { Lobby } from "./Lobby";
import menuHero from "../../assets/menu-hero.jpg";

type Tab = "play" | "practice" | "multiplayer" | "loadout" | "settings" | "controls" | "stats";

const TABS: { id: Tab; label: string; hint: string; badge?: boolean }[] = [
  { id: "play", label: "Campaign", hint: "Deploy into the scrapyard" },
  { id: "multiplayer", label: "Multiplayer", hint: "Private rooms, live sync", badge: true },
  { id: "practice", label: "Practice Range", hint: "Slow targets, no pressure" },
  { id: "loadout", label: "Loadout", hint: "Primary & sidearm" },
  { id: "stats", label: "Progression", hint: "Career record" },
  { id: "settings", label: "Settings", hint: "Aim, view, audio" },
  { id: "controls", label: "Controls", hint: "Key bindings" },
];

const CONTROLS: [string, string][] = [
  ["W A S D", "Move"],
  ["Mouse", "Aim"],
  ["Left Click", "Fire"],
  ["Right Click", "Aim down sights"],
  ["Space", "Jump"],
  ["Shift", "Sprint"],
  ["Ctrl", "Crouch"],
  ["R", "Reload"],
  ["1 – 5", "Switch weapon"],
  ["Q", "Quick swap"],
  ["Esc", "Release cursor / menu"],
];


function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hud-dim/20 pb-4">
        <h2 className="text-2xl font-bold uppercase tracking-[0.22em] text-hud-fg">{title}</h2>
        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-hud-dim">{subtitle}</p>
      </div>
      <div className="mt-5 flex-1 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-hud-dim/20 bg-black/30 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-hud-fg">{value}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.25em] text-hud-dim">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-hud-accent">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-hud-track accent-hud-accent"
        style={{ accentColor: "var(--hud-accent)" }}
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-sm border border-hud-dim/20 bg-black/30 px-4 py-3 text-left transition-colors hover:border-hud-accent/60"
    >
      <span className="text-xs uppercase tracking-[0.25em] text-hud-dim">{label}</span>
      <span
        className={`rounded-sm px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
          value ? "bg-hud-accent/30 text-hud-fg" : "bg-hud-track text-hud-dim"
        }`}
      >
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}

function WeaponRow({
  id,
  selected,
  onSelect,
}: {
  id: WeaponId;
  selected: boolean;
  onSelect: () => void;
}) {
  const w = WEAPONS[id];
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-sm border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-hud-accent bg-hud-accent/15"
          : "border-hud-dim/20 bg-black/30 hover:border-hud-accent/50"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold uppercase tracking-[0.18em] text-hud-fg">{w.name}</span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">SLOT {w.slot}</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] uppercase tracking-[0.2em] text-hud-dim">
        <span>DMG {w.damage}</span>
        <span>RPM {w.rpm}</span>
        <span>MAG {w.magSize}</span>
        <span>{w.auto ? "AUTO" : "SEMI"}</span>
      </div>
    </button>
  );
}

export function MainMenu({ onDeploy }: { onDeploy: () => void }) {
  const [tab, setTab] = useState<Tab | null>(null);
  const { start, settings, updateSettings, resetSettings, loadout, setLoadout, stats, resetStats } =
    useGame();

  const accuracy = stats.shotsFired > 0 ? (stats.shotsHit / stats.shotsFired) * 100 : 0;
  const kd = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills;

  const launch = (mode: "combat" | "practice") => {
    start(mode);
    onDeploy();
  };

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    updateSettings({ [key]: value } as Partial<Settings>);

  const rank = Math.min(99, 1 + Math.floor(stats.kills / 5));
  const progress = ((stats.kills % 5) / 5) * 100;

  return (
    <div className="pointer-events-auto absolute inset-0 overflow-hidden font-hud">
      {/* key art */}
      <img
        src={menuHero}
        alt="Ruined city skyline at sunset with an armored operator standing on rubble"
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover object-right"
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-menu-scrim)" }}
      />

      {/* left icon rail */}
      <div
        className="absolute inset-y-0 left-0 z-20 flex w-14 flex-col items-center gap-6 border-r border-hud-accent/15 py-5"
        style={{ background: "var(--gradient-rail)" }}
      >
        <MenuIcon className="size-5 text-hud-dim" />
        <div className="mt-6 flex flex-1 flex-col items-center gap-6">
          {[Home, Volume2, Music, MessageSquare, SettingsIcon].map((Icon, i) => (
            <button
              key={i}
              onClick={() => setTab(i === 4 ? "settings" : null)}
              aria-label="Menu shortcut"
              className={`relative flex size-9 items-center justify-center transition-colors ${
                i === 0 ? "text-hud-accent" : "text-hud-dim hover:text-hud-fg"
              }`}
            >
              {i === 0 && (
                <span className="absolute -left-3 h-7 w-0.5 bg-hud-accent" aria-hidden />
              )}
              <Icon className="size-5" />
            </button>
          ))}
        </div>
        <button
          onClick={() => setTab(null)}
          aria-label="Exit menu"
          className="text-hud-dim transition-colors hover:text-hud-health"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      {/* top-right utility icons */}
      <div className="absolute right-6 top-5 z-20 flex items-center gap-5">
        <BarChart3 className="size-5 text-hud-dim" />
        <button
          onClick={() => setTab("settings")}
          aria-label="Settings"
          className="text-hud-dim transition-colors hover:text-hud-accent"
        >
          <SettingsIcon className="size-5" />
        </button>
      </div>

      {/* title */}
      <h1 className="absolute left-1/2 top-6 z-10 -translate-x-1/2 text-center text-5xl font-black uppercase leading-none tracking-[0.06em] md:text-7xl">
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: "var(--gradient-title)",
            filter: "drop-shadow(var(--shadow-title))",
          }}
        >
          Dust Protocol
        </span>
      </h1>

      {/* main vertical menu */}
      <nav className="absolute left-20 top-1/2 z-10 flex w-[22rem] -translate-y-1/2 flex-col md:left-28">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`group flex items-center justify-between border-b border-hud-dim/15 px-4 py-2.5 text-left transition-all ${
                active
                  ? "border border-hud-accent bg-black/45"
                  : "hover:translate-x-1 hover:bg-black/30"
              }`}
            >
              <span
                className={`text-2xl font-black uppercase tracking-[0.06em] md:text-3xl ${
                  active ? "text-hud-fg" : "text-hud-accent group-hover:text-hud-fg"
                }`}
                style={{ textShadow: "var(--shadow-menu-item)" }}
              >
                {t.label}
              </span>
              {t.badge && <Skull className="size-5 text-hud-fg/80" />}
            </button>
          );
        })}
      </nav>

      {/* footer user bar */}
      <div className="absolute bottom-6 left-20 z-10 w-[28rem] md:left-28">
        <div className="text-lg font-bold uppercase tracking-[0.1em] text-hud-fg">
          <span className="text-hud-dim">User: </span>Operator
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-hud-dim">
          <span>
            Lvl {rank}, Rank <span className="text-hud-accent">Elite</span>
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-hud-track">
            <div className="h-full bg-hud-accent" style={{ width: `${progress}%` }} />
          </div>
          <span>Progression</span>
        </div>
        <div className="mt-2 flex items-center gap-6 text-xs uppercase tracking-[0.18em] text-hud-dim">
          <span>
            <span className="font-bold text-hud-fg tabular-nums">{stats.kills * 100}</span> Credits
          </span>
          <span>
            <span className="font-bold text-hud-fg tabular-nums">{stats.bestScore}</span> Best Score
          </span>
        </div>
      </div>

      {/* panel overlay */}
      {tab && (
        <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-2xl flex-col border-l border-hud-accent/20 p-8 backdrop-blur-md"
          style={{ background: "var(--menu-panel)", boxShadow: "var(--shadow-menu)" }}
        >
          <button
            onClick={() => setTab(null)}
            aria-label="Close panel"
            className="absolute right-5 top-5 text-hud-dim transition-colors hover:text-hud-fg"
          >
            <X className="size-5" />
          </button>
          <div className="min-h-0 flex-1">

          {tab === "play" && (
            <Panel title="Play" subtitle="Combat — respawning sentinels">
              <p className="max-w-xl text-sm leading-relaxed text-hud-dim">
                Hold the sunbaked scrapyard against the sentinel line. Kills score, headshots score
                more, and nothing you hide behind is permanent.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Stat label="Best Score" value={stats.bestScore} />
                <Stat label="Best Streak" value={stats.bestStreak} />
                <Stat label="Matches" value={stats.matches} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-hud-dim/20 bg-black/30 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">Primary</div>
                  <div className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-hud-fg">
                    {WEAPONS[loadout.primary].name}
                  </div>
                </div>
                <div className="rounded-sm border border-hud-dim/20 bg-black/30 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-hud-dim">Sidearm</div>
                  <div className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-hud-fg">
                    {WEAPONS[loadout.secondary].name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => launch("combat")}
                className="mt-8 w-full rounded-sm border border-hud-accent bg-hud-accent/25 py-4 text-sm font-bold uppercase tracking-[0.35em] text-hud-fg transition-colors hover:bg-hud-accent/45"
              >
                Deploy
              </button>
            </Panel>
          )}

          {tab === "practice" && (
            <Panel title="Practice" subtitle="Free range — extra armor">
              <p className="max-w-xl text-sm leading-relaxed text-hud-dim">
                Same arena, gentler rules: you spawn with full armor plating so you can learn recoil
                patterns, sightlines and headshot timing without getting wiped.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Stat label="Armor" value="100" />
                <Stat label="Targets" value="7" />
                <Stat label="Score Kept" value="No" />
              </div>
              <ul className="mt-6 space-y-2 text-xs uppercase tracking-[0.2em] text-hud-dim">
                <li>· Sentinels respawn continuously</li>
                <li>· Full reserve ammo on spawn</li>
                <li>· Career accuracy still tracked</li>
              </ul>
              <button
                onClick={() => launch("practice")}
                className="mt-8 w-full rounded-sm border border-hud-armor bg-hud-armor/20 py-4 text-sm font-bold uppercase tracking-[0.35em] text-hud-fg transition-colors hover:bg-hud-armor/40"
              >
                Enter Range
              </button>
            </Panel>
          )}

          {tab === "multiplayer" && (
            <Panel title="Multiplayer" subtitle="Private lobby — realtime">
              <Lobby onDeploy={onDeploy} />
            </Panel>
          )}

          {tab === "loadout" && (
            <Panel title="Loadout" subtitle="Pick your spawn weapons">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-hud-accent">
                    Primary
                  </div>
                  <div className="space-y-2">
                    {WEAPON_ORDER.map((id) => (
                      <WeaponRow
                        key={id}
                        id={id}
                        selected={loadout.primary === id}
                        onSelect={() => setLoadout({ primary: id })}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-hud-accent">
                    Sidearm
                  </div>
                  <div className="space-y-2">
                    {WEAPON_ORDER.map((id) => (
                      <WeaponRow
                        key={id}
                        id={id}
                        selected={loadout.secondary === id}
                        onSelect={() => setLoadout({ secondary: id })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {tab === "settings" && (
            <Panel title="Settings" subtitle="Aim, view and audio">
              <div className="max-w-xl space-y-6">
                <Slider
                  label="Mouse Sensitivity"
                  value={settings.sensitivity}
                  min={0.2}
                  max={3}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => set("sensitivity", v)}
                />
                <Slider
                  label="Field of View"
                  value={settings.fov}
                  min={60}
                  max={110}
                  step={1}
                  format={(v) => `${v.toFixed(0)}°`}
                  onChange={(v) => set("fov", v)}
                />
                <Slider
                  label="Master Volume"
                  value={settings.masterVolume}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => set("masterVolume", v)}
                />
                <Toggle
                  label="Invert Vertical Aim"
                  value={settings.invertY}
                  onChange={(v) => set("invertY", v)}
                />
                <Toggle
                  label="Show Kill Feed"
                  value={settings.showKillFeed}
                  onChange={(v) => set("showKillFeed", v)}
                />
                <button
                  onClick={resetSettings}
                  className="rounded-sm border border-hud-dim/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.28em] text-hud-dim transition-colors hover:border-hud-accent hover:text-hud-fg"
                >
                  Restore Defaults ({DEFAULT_SETTINGS.fov}° / {DEFAULT_SETTINGS.sensitivity.toFixed(2)})
                </button>
              </div>
            </Panel>
          )}

          {tab === "controls" && (
            <Panel title="Controls" subtitle="Fixed key bindings">
              <div className="grid gap-2 sm:grid-cols-2">
                {CONTROLS.map(([key, action]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-sm border border-hud-dim/20 bg-black/30 px-4 py-3"
                  >
                    <span className="text-xs uppercase tracking-[0.22em] text-hud-dim">{action}</span>
                    <span className="rounded-sm bg-hud-track px-2.5 py-1 text-[11px] font-bold tracking-[0.18em] text-hud-fg">
                      {key}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-hud-dim">
                Click the arena to capture the cursor. Press Esc to release it.
              </p>
            </Panel>
          )}

          {tab === "stats" && (
            <Panel title="Statistics" subtitle="Career record — saved locally">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Matches" value={stats.matches} />
                <Stat label="Kills" value={stats.kills} />
                <Stat label="Deaths" value={stats.deaths} />
                <Stat label="Headshots" value={stats.headshots} />
                <Stat label="K/D" value={kd.toFixed(2)} />
                <Stat label="Accuracy" value={`${accuracy.toFixed(1)}%`} />
                <Stat label="Shots Fired" value={stats.shotsFired} />
                <Stat label="Best Score" value={stats.bestScore} />
                <Stat label="Best Streak" value={stats.bestStreak} />
              </div>
              <button
                onClick={resetStats}
                className="mt-6 rounded-sm border border-hud-health/60 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.28em] text-hud-health transition-colors hover:bg-hud-health/20"
              >
                Reset Career
              </button>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
