import { create } from "zustand";
import { WEAPONS, WEAPON_ORDER, type WeaponId } from "./weapons";

export interface AmmoState {
  mag: number;
  reserve: number;
}

export interface Settings {
  sensitivity: number;
  invertY: boolean;
  masterVolume: number;
  fov: number;
  showKillFeed: boolean;
}

export interface Loadout {
  primary: WeaponId;
  secondary: WeaponId;
}

export interface Stats {
  matches: number;
  kills: number;
  headshots: number;
  deaths: number;
  bestScore: number;
  bestStreak: number;
  shotsFired: number;
  shotsHit: number;
}

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  invertY: false,
  masterVolume: 0.35,
  fov: 78,
  showKillFeed: true,
};

export const DEFAULT_LOADOUT: Loadout = { primary: "rifle", secondary: "pistol" };

export const DEFAULT_STATS: Stats = {
  matches: 0,
  kills: 0,
  headshots: 0,
  deaths: 0,
  bestScore: 0,
  bestStreak: 0,
  shotsFired: 0,
  shotsHit: 0,
};

interface GameState {
  phase: "menu" | "playing" | "dead";
  mode: "combat" | "practice";
  health: number;
  armor: number;
  lastDamageAt: number;
  kills: number;
  score: number;
  deaths: number;
  streak: number;
  current: WeaponId;
  ammo: Record<WeaponId, AmmoState>;
  reloading: boolean;
  ads: boolean;
  hitMarker: { at: number; head: boolean; kill: boolean };
  damageFlash: number;
  killFeed: { id: number; text: string; head: boolean }[];
  settings: Settings;
  loadout: Loadout;
  stats: Stats;

  start: (mode?: GameState["mode"]) => void;
  respawn: () => void;
  toMenu: () => void;
  setPhase: (p: GameState["phase"]) => void;
  setCurrent: (w: WeaponId) => void;
  setReloading: (v: boolean) => void;
  setAds: (v: boolean) => void;
  spendRound: () => void;
  finishReload: () => void;
  registerHit: (head: boolean, kill: boolean, name: string) => void;
  takeDamage: (amount: number) => void;
  regen: (dt: number) => void;
  addAmmoPickup: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  setLoadout: (patch: Partial<Loadout>) => void;
  resetStats: () => void;
}


const freshAmmo = (): Record<WeaponId, AmmoState> =>
  WEAPON_ORDER.reduce(
    (acc, id) => {
      acc[id] = { mag: WEAPONS[id].magSize, reserve: WEAPONS[id].reserveMax };
      return acc;
    },
    {} as Record<WeaponId, AmmoState>,
  );

// Health regen: waits this long after the last hit, then heals this many HP per second.
const REGEN_DELAY_MS = 4000;
const REGEN_RATE = 14;

let feedId = 0;

const LS_KEY = "deadzone:v1";

function loadPersisted(): { settings: Settings; loadout: Loadout; stats: Stats } {
  const base = { settings: DEFAULT_SETTINGS, loadout: DEFAULT_LOADOUT, stats: DEFAULT_STATS };
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<typeof base>;
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      loadout: { ...DEFAULT_LOADOUT, ...(parsed.loadout ?? {}) },
      stats: { ...DEFAULT_STATS, ...(parsed.stats ?? {}) },
    };
  } catch {
    return base;
  }
}

function persist(state: { settings: Settings; loadout: Loadout; stats: Stats }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_KEY,
      JSON.stringify({ settings: state.settings, loadout: state.loadout, stats: state.stats }),
    );
  } catch {
    /* storage unavailable */
  }
}

const persisted = loadPersisted();

export const useGame = create<GameState>((set, get) => ({
  phase: "menu",
  mode: "combat",
  health: 100,
  armor: 50,
  lastDamageAt: 0,
  kills: 0,
  score: 0,
  deaths: 0,
  streak: 0,
  current: persisted.loadout.primary,
  ammo: freshAmmo(),
  reloading: false,
  ads: false,
  hitMarker: { at: 0, head: false, kill: false },
  damageFlash: 0,
  killFeed: [],
  settings: persisted.settings,
  loadout: persisted.loadout,
  stats: persisted.stats,

  start: (mode = "combat") => {
    const s = get();
    const stats = { ...s.stats, matches: s.stats.matches + 1 };
    persist({ ...s, stats });
    set({
      phase: "playing",
      mode,
      health: 100,
      armor: mode === "practice" ? 100 : 50,
      lastDamageAt: 0,
      kills: 0,
      score: 0,
      deaths: 0,
      streak: 0,
      ammo: freshAmmo(),
      current: s.loadout.primary,
      reloading: false,
      ads: false,
      killFeed: [],
      stats,
    });
  },

  respawn: () =>
    set((s) => ({
      phase: "playing",
      health: 100,
      armor: s.mode === "practice" ? 100 : 50,
      lastDamageAt: 0,
      reloading: false,
      ads: false,
      streak: 0,
      ammo: freshAmmo(),
      deaths: s.deaths,
    })),

  toMenu: () => set({ phase: "menu", ads: false, reloading: false }),

  updateSettings: (patch) =>
    set((s) => {
      const settings = { ...s.settings, ...patch };
      persist({ ...s, settings });
      return { settings };
    }),

  resetSettings: () =>
    set((s) => {
      persist({ ...s, settings: DEFAULT_SETTINGS });
      return { settings: DEFAULT_SETTINGS };
    }),

  setLoadout: (patch) =>
    set((s) => {
      const loadout = { ...s.loadout, ...patch };
      persist({ ...s, loadout });
      return { loadout, current: s.phase === "playing" ? s.current : loadout.primary };
    }),

  resetStats: () =>
    set((s) => {
      persist({ ...s, stats: DEFAULT_STATS });
      return { stats: DEFAULT_STATS };
    }),


  setPhase: (phase) => set({ phase }),
  setCurrent: (current) => set({ current, reloading: false, ads: false }),
  setReloading: (reloading) => set({ reloading }),
  setAds: (ads) => set({ ads }),

  spendRound: () =>
    set((s) => {
      const a = s.ammo[s.current];
      if (a.mag <= 0) return s;
      const stats = { ...s.stats, shotsFired: s.stats.shotsFired + 1 };
      persist({ ...s, stats });
      return { ammo: { ...s.ammo, [s.current]: { ...a, mag: a.mag - 1 } }, stats };
    }),

  finishReload: () =>
    set((s) => {
      const def = WEAPONS[s.current];
      const a = s.ammo[s.current];
      const need = Math.min(def.magSize - a.mag, a.reserve);
      return {
        reloading: false,
        ammo: {
          ...s.ammo,
          [s.current]: { mag: a.mag + need, reserve: a.reserve - need },
        },
      };
    }),

  registerHit: (head, kill, name) =>
    set((s) => {
      const kills = kill ? s.kills + 1 : s.kills;
      const score = s.score + (kill ? (head ? 150 : 100) : head ? 25 : 10);
      const streak = kill ? s.streak + 1 : s.streak;
      const stats: Stats = {
        ...s.stats,
        kills: kill ? s.stats.kills + 1 : s.stats.kills,
        headshots: head ? s.stats.headshots + 1 : s.stats.headshots,
        shotsHit: s.stats.shotsHit + 1,
        bestScore: Math.max(s.stats.bestScore, score),
        bestStreak: Math.max(s.stats.bestStreak, streak),
      };
      persist({ ...s, stats });
      return {
        hitMarker: { at: performance.now(), head, kill },
        kills,
        score,
        streak,
        stats,
        killFeed: kill
          ? [{ id: ++feedId, text: name, head }, ...s.killFeed].slice(0, 4)
          : s.killFeed,
      };
    }),

  takeDamage: (amount) => {
    const s = get();
    if (s.phase !== "playing") return;
    const toArmor = Math.min(s.armor, amount * 0.6);
    const toHealth = amount - toArmor;
    const health = Math.max(0, s.health - toHealth);
    const died = health <= 0;
    const stats = died ? { ...s.stats, deaths: s.stats.deaths + 1 } : s.stats;
    if (died) persist({ ...s, stats });
    set({
      armor: Math.max(0, s.armor - toArmor),
      health,
      damageFlash: performance.now(),
      lastDamageAt: performance.now(),
      phase: died ? "dead" : "playing",
      deaths: died ? s.deaths + 1 : s.deaths,
      streak: died ? 0 : s.streak,
      stats,
    });
  },

  // Passive health regeneration after a short out-of-combat delay.
  regen: (dt) => {
    const s = get();
    if (s.phase !== "playing" || s.health >= 100) return;
    if (performance.now() - s.lastDamageAt < REGEN_DELAY_MS) return;
    set({ health: Math.min(100, s.health + REGEN_RATE * dt) });
  },



  addAmmoPickup: () =>
    set((s) => {
      const next = { ...s.ammo };
      for (const id of WEAPON_ORDER) {
        next[id] = {
          ...next[id],
          reserve: Math.min(WEAPONS[id].reserveMax, next[id].reserve + Math.ceil(WEAPONS[id].magSize * 0.8)),
        };
      }
      return { ammo: next };
    }),
}));
