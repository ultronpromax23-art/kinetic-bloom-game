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
  const [tab, setTab] = useState<Tab>("play");
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

  return (
    <div
      className="pointer-events-auto absolute inset-0 flex items-center justify-center px-6 py-8 font-hud"
      style={{ background: "var(--gradient-menu), var(--menu-bg)" }}
    >
      <div
        className="grid h-full max-h-[46rem] w-full max-w-6xl grid-rows-[auto_1fr] gap-6 rounded-md border border-hud-dim/20 p-8 backdrop-blur-md md:grid-rows-1 md:grid-cols-[19rem_1fr]"
        style={{ background: "var(--menu-panel)", boxShadow: "var(--shadow-menu)" }}
      >
        {/* left column: brand + nav */}
        <div className="flex flex-col">
          <div>
            <h1 className="text-5xl font-black uppercase leading-none tracking-[0.12em] text-hud-accent">
              Dust Protocol
            </h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-hud-dim">
              Scrapyard Protocol · v1.0
            </p>
          </div>

          <nav className="mt-8 flex flex-col gap-1.5">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group flex items-center gap-3 rounded-sm border-l-2 px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-hud-accent bg-hud-accent/15"
                      : "border-transparent hover:border-hud-accent/50 hover:bg-black/25"
                  }`}
                >
                  <span
                    className={`text-sm font-bold uppercase tracking-[0.24em] ${
                      active ? "text-hud-fg" : "text-hud-dim group-hover:text-hud-fg"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden pt-6 text-[10px] uppercase tracking-[0.28em] text-hud-dim md:block">
            {TABS.find((t) => t.id === tab)?.hint}
          </div>
        </div>

        {/* right column: panel */}
        <div className="min-h-0 rounded-sm border border-hud-dim/15 bg-black/25 p-6">
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
