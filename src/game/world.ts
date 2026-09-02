import * as THREE from "three";

export interface BoxDef {
  pos: [number, number, number];
  size: [number, number, number];
  kind: "wall" | "crate" | "pillar" | "ramp" | "building" | "curb";
}

/** Arena layout: single source of truth for rendering AND collision. */
export const ARENA_SIZE = 64;
const H = ARENA_SIZE / 2;

/** Street runs along Z through the middle; city block west, forest east. */
export const ROAD_HALF_WIDTH = 7;

function buildingRow(x: number, facing: 1 | -1): BoxDef[] {
  const out: BoxDef[] = [];
  const depths = [7, 9, 6, 8, 7, 9];
  const heights = [12, 17, 9, 20, 14, 11];
  let z = -H + 3;
  depths.forEach((d, i) => {
    const w = 8 + (i % 3) * 2;
    const h = heights[i] ?? 12;
    out.push({
      pos: [x + (facing * d) / 2, h / 2, z + w / 2],
      size: [d, h, w - 0.6],
      kind: "building",
    });
    z += w + 0.6;
  });
  return out;
}

export const BOXES: BoxDef[] = [
  // perimeter walls
  { pos: [0, 5, -H], size: [ARENA_SIZE, 10, 1.5], kind: "wall" },
  { pos: [0, 5, H], size: [ARENA_SIZE, 10, 1.5], kind: "wall" },
  { pos: [-H, 5, 0], size: [1.5, 10, ARENA_SIZE], kind: "wall" },
  { pos: [H, 5, 0], size: [1.5, 10, ARENA_SIZE], kind: "wall" },

  // city block (west side of the street)
  ...buildingRow(-ROAD_HALF_WIDTH - 2, -1),
  // sidewalk curbs
  { pos: [-ROAD_HALF_WIDTH - 1, 0.15, 0], size: [2.4, 0.3, ARENA_SIZE - 4], kind: "curb" },
  { pos: [ROAD_HALF_WIDTH + 1, 0.15, 0], size: [2.4, 0.3, ARENA_SIZE - 4], kind: "curb" },

  // street cover
  { pos: [-2, 1.1, -18], size: [4.5, 2.2, 2], kind: "crate" },
  { pos: [3, 1.4, -4], size: [2.4, 2.8, 5], kind: "crate" },
  { pos: [-3.5, 0.9, 9], size: [5, 1.8, 2.2], kind: "crate" },
  { pos: [2, 1.2, 22], size: [3, 2.4, 3], kind: "crate" },

  // ruined outbuildings at the forest edge
  { pos: [17, 2.2, -20], size: [9, 4.4, 7], kind: "building" },
  { pos: [24, 1.8, 6], size: [7, 3.6, 9], kind: "building" },
  { pos: [17, 1.5, 26], size: [6, 3, 6], kind: "building" },
  { pos: [26, 1.3, -6], size: [2.4, 2.6, 6], kind: "crate" },
  { pos: [12, 1, 12], size: [4, 2, 2.4], kind: "crate" },
  { pos: [20, 1, -2], size: [2.6, 2, 2.6], kind: "crate" },
];

export interface TreeDef {
  pos: [number, number];
  height: number;
  radius: number;
  tilt: number;
}

function makeTrees(): TreeDef[] {
  const out: TreeDef[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 62; i++) {
    const x = ROAD_HALF_WIDTH + 4 + rnd() * (H - ROAD_HALF_WIDTH - 8);
    const z = (rnd() - 0.5) * (ARENA_SIZE - 8);
    // keep clear of the outbuildings
    const clash = BOXES.some(
      (b) =>
        b.kind === "building" &&
        Math.abs(b.pos[0] - x) < b.size[0] / 2 + 2 &&
        Math.abs(b.pos[2] - z) < b.size[2] / 2 + 2,
    );
    if (clash) continue;
    out.push({
      pos: [x, z],
      height: 7 + rnd() * 8,
      radius: 0.28 + rnd() * 0.22,
      tilt: (rnd() - 0.5) * 0.12,
    });
  }
  return out;
}

export const TREES: TreeDef[] = makeTrees();

export const COLLIDERS: THREE.Box3[] = [
  ...BOXES.filter((b) => b.kind !== "curb").map((b) =>
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(...b.pos),
      new THREE.Vector3(...b.size),
    ),
  ),
  ...TREES.map((t) =>
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(t.pos[0], t.height / 2, t.pos[1]),
      new THREE.Vector3(t.radius * 2.2, t.height, t.radius * 2.2),
    ),
  ),
];


export const ENEMY_NAMES = [
  "SENTINEL-04",
  "HUSK-12",
  "RATCHET-09",
  "WARDEN-77",
  "CINDER-31",
  "VULTURE-58",
  "DRIFTER-22",
  "IRONJAW-16",
];

export interface Enemy {
  id: number;
  name: string;
  alive: boolean;
  /** feet position */
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  respawnAt: number;
  nextShot: number;
  hitFlash: number;
  bob: number;
  wander: THREE.Vector3;
  deadFor: number;
}

export const BODY_OFFSET = 1.0;
export const BODY_RADIUS = 0.55;
export const HEAD_OFFSET = 1.78;
export const HEAD_RADIUS = 0.27;

export interface Tracer {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  life: number;
  max: number;
}

export interface Impact {
  pos: THREE.Vector3;
  normal: THREE.Vector3;
  life: number;
  color: string;
  flesh: boolean;
}

export const world = {
  enemies: [] as Enemy[],
  tracers: [] as Tracer[],
  impacts: [] as Impact[],
  playerPos: new THREE.Vector3(0, 0, 22),
  playerEye: new THREE.Vector3(0, 1.65, 22),
  view: { recoilPitch: 0, recoilKick: 0, flash: 0, reloadT: 0, bob: 0, sway: 0, yaw: 0 },
};

export function spawnTracer(from: THREE.Vector3, to: THREE.Vector3, color: string, max = 0.09) {
  world.tracers.push({ from: from.clone(), to: to.clone(), color, life: max, max });
  if (world.tracers.length > 40) world.tracers.shift();
}

export function spawnImpact(pos: THREE.Vector3, normal: THREE.Vector3, color: string, flesh = false) {
  world.impacts.push({ pos: pos.clone(), normal: normal.clone(), life: flesh ? 0.35 : 0.5, color, flesh });
  if (world.impacts.length > 30) world.impacts.shift();
}

const _tmpBox = new THREE.Box3();

/** Nearest arena hit along a ray. Returns distance + normal, or null. */
export function rayWorld(
  ray: THREE.Ray,
  maxDist: number,
): { dist: number; point: THREE.Vector3; normal: THREE.Vector3 } | null {
  let best: { dist: number; point: THREE.Vector3; normal: THREE.Vector3 } | null = null;

  // ground plane y = 0
  if (ray.direction.y < -1e-6) {
    const t = -ray.origin.y / ray.direction.y;
    if (t > 0 && t < maxDist) {
      best = {
        dist: t,
        point: ray.at(t, new THREE.Vector3()),
        normal: new THREE.Vector3(0, 1, 0),
      };
    }
  }

  for (const box of COLLIDERS) {
    const p = ray.intersectBox(box, new THREE.Vector3());
    if (!p) continue;
    const d = p.distanceTo(ray.origin);
    if (d > maxDist || (best && d >= best.dist)) continue;
    // derive face normal from closest face
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const local = p.clone().sub(c);
    const rel = new THREE.Vector3(
      Math.abs(local.x) / s.x,
      Math.abs(local.y) / s.y,
      Math.abs(local.z) / s.z,
    );
    const normal = new THREE.Vector3();
    if (rel.x >= rel.y && rel.x >= rel.z) normal.set(Math.sign(local.x), 0, 0);
    else if (rel.y >= rel.z) normal.set(0, Math.sign(local.y), 0);
    else normal.set(0, 0, Math.sign(local.z));
    best = { dist: d, point: p, normal };
  }
  return best;
}

/** True if a clear line of sight exists between two points. */
export function hasLineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
  const dir = b.clone().sub(a);
  const len = dir.length();
  dir.normalize();
  const ray = new THREE.Ray(a, dir);
  for (const box of COLLIDERS) {
    _tmpBox.copy(box);
    const p = ray.intersectBox(_tmpBox, new THREE.Vector3());
    if (p && p.distanceTo(a) < len - 0.05) return false;
  }
  return true;
}

/** Ray vs sphere; returns distance or null. */
export function raySphere(ray: THREE.Ray, center: THREE.Vector3, radius: number): number | null {
  const oc = ray.origin.clone().sub(center);
  const b = oc.dot(ray.direction);
  const c = oc.lengthSq() - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t = -b - sq;
  if (t > 0.01) return t;
  const t2 = -b + sq;
  return t2 > 0.01 ? t2 : null;
}

export function randomSpawn(awayFrom: THREE.Vector3): THREE.Vector3 {
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * (ARENA_SIZE - 8),
      0,
      (Math.random() - 0.5) * (ARENA_SIZE - 8),
    );
    if (p.distanceTo(awayFrom) < 14) continue;
    const test = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(p.x, 1, p.z),
      new THREE.Vector3(1.6, 2, 1.6),
    );
    if (COLLIDERS.some((b) => b.intersectsBox(test))) continue;
    return p;
  }
  return new THREE.Vector3(0, 0, -24);
}

export function resetWorld() {
  world.enemies = [];
  world.tracers = [];
  world.impacts = [];
  for (let i = 0; i < 7; i++) {
    world.enemies.push({
      id: i,
      name: ENEMY_NAMES[i % ENEMY_NAMES.length] ?? "SENTINEL",
      alive: true,
      pos: randomSpawn(new THREE.Vector3(0, 0, 22)),
      vel: new THREE.Vector3(),
      hp: 100,
      maxHp: 100,
      respawnAt: 0,
      nextShot: 1.5 + Math.random() * 3,
      hitFlash: 0,
      bob: Math.random() * 10,
      wander: new THREE.Vector3(),
      deadFor: 0,
    });
  }
}
