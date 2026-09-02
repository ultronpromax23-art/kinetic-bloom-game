export type WeaponId = "rifle" | "smg" | "shotgun" | "sniper" | "pistol";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  slot: number;
  damage: number;
  headMult: number;
  /** rounds per minute */
  rpm: number;
  auto: boolean;
  magSize: number;
  reserveMax: number;
  reloadTime: number;
  /** radians of cone spread from hip */
  spread: number;
  adsSpread: number;
  pellets: number;
  recoil: number;
  range: number;
  adsFov: number;
  tracer: string;
  /** viewmodel proportions [len, height, width] */
  body: [number, number, number];
  barrel: [number, number];
  scope: boolean;
  tone: { base: number; noise: number; decay: number; punch: number };
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  rifle: {
    id: "rifle",
    name: "VK-7 Longshore",
    slot: 1,
    damage: 26,
    headMult: 2.2,
    rpm: 620,
    auto: true,
    magSize: 30,
    reserveMax: 180,
    reloadTime: 2.1,
    spread: 0.028,
    adsSpread: 0.006,
    pellets: 1,
    recoil: 0.014,
    range: 220,
    adsFov: 45,
    tracer: "#ffb46b",
    body: [0.62, 0.13, 0.09],
    barrel: [0.42, 0.028],
    scope: false,
    tone: { base: 150, noise: 0.7, decay: 0.16, punch: 0.9 },
  },
  smg: {
    id: "smg",
    name: "Wasp 9",
    slot: 2,
    damage: 16,
    headMult: 1.9,
    rpm: 950,
    auto: true,
    magSize: 35,
    reserveMax: 245,
    reloadTime: 1.7,
    spread: 0.045,
    adsSpread: 0.018,
    pellets: 1,
    recoil: 0.009,
    range: 120,
    adsFov: 55,
    tracer: "#ffd98a",
    body: [0.42, 0.12, 0.08],
    barrel: [0.2, 0.024],
    scope: false,
    tone: { base: 210, noise: 0.6, decay: 0.1, punch: 0.7 },
  },
  shotgun: {
    id: "shotgun",
    name: "Breaker 12",
    slot: 3,
    damage: 15,
    headMult: 1.7,
    rpm: 75,
    auto: false,
    magSize: 6,
    reserveMax: 42,
    reloadTime: 2.6,
    spread: 0.1,
    adsSpread: 0.06,
    pellets: 9,
    recoil: 0.06,
    range: 45,
    adsFov: 60,
    tracer: "#ffa04d",
    body: [0.72, 0.14, 0.1],
    barrel: [0.5, 0.036],
    scope: false,
    tone: { base: 90, noise: 1, decay: 0.32, punch: 1.4 },
  },
  sniper: {
    id: "sniper",
    name: "Meridian AX",
    slot: 4,
    damage: 95,
    headMult: 2.6,
    rpm: 48,
    auto: false,
    magSize: 5,
    reserveMax: 30,
    reloadTime: 3.2,
    spread: 0.05,
    adsSpread: 0.0005,
    pellets: 1,
    recoil: 0.075,
    range: 400,
    adsFov: 18,
    tracer: "#bfe3ff",
    body: [0.95, 0.13, 0.09],
    barrel: [0.7, 0.03],
    scope: true,
    tone: { base: 70, noise: 0.9, decay: 0.45, punch: 1.6 },
  },
  pistol: {
    id: "pistol",
    name: "Sidewinder 45",
    slot: 5,
    damage: 30,
    headMult: 2.4,
    rpm: 330,
    auto: false,
    magSize: 12,
    reserveMax: 96,
    reloadTime: 1.3,
    spread: 0.022,
    adsSpread: 0.005,
    pellets: 1,
    recoil: 0.022,
    range: 100,
    adsFov: 50,
    tracer: "#ffe0a3",
    body: [0.26, 0.14, 0.06],
    barrel: [0.1, 0.022],
    scope: false,
    tone: { base: 170, noise: 0.75, decay: 0.2, punch: 1.05 },
  },
};

export const WEAPON_ORDER: WeaponId[] = ["rifle", "smg", "shotgun", "sniper", "pistol"];
