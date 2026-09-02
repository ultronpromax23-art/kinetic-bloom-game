import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  BODY_OFFSET,
  HEAD_OFFSET,
  COLLIDERS,
  hasLineOfSight,
  randomSpawn,
  spawnTracer,
  world,
} from "../../game/world";
import { useGame } from "../../game/store";
import { useMultiplayer } from "../../game/multiplayer";
import { collectTargets, targetEye } from "./RemotePlayers";
import { playEnemyShot, playHurt } from "../../game/audio";

const EYE = new THREE.Vector3();
const DIR = new THREE.Vector3();
const TGT_EYE = new THREE.Vector3();

function EnemyModel({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const headMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const e = world.enemies[index];
    const g = group.current;
    if (!e || !g) return;
    g.visible = e.alive || e.deadFor < 1.2;
    if (!g.visible) return;
    g.position.copy(e.pos);
    if (e.alive) {
      DIR.copy(world.playerEye).sub(e.pos);
      g.rotation.set(0, Math.atan2(DIR.x, DIR.z), 0);
      g.position.y += Math.sin(e.bob * 2.6) * 0.05;
      g.scale.setScalar(1);
    } else {
      // collapse on death
      const t = Math.min(1, e.deadFor / 0.5);
      g.rotation.x = -t * Math.PI * 0.48;
      g.position.y = -0.1 * t;
      g.scale.setScalar(1 - t * 0.1);
    }
    const flash = Math.max(0, e.hitFlash);
    if (bodyMat.current) bodyMat.current.emissiveIntensity = 0.25 + flash * 4;
    if (headMat.current) headMat.current.emissiveIntensity = 0.4 + flash * 4;
  });

  return (
    <group ref={group}>
      {/* legs */}
      <mesh position={[-0.16, 0.28, 0]} castShadow>
        <boxGeometry args={[0.2, 0.56, 0.24]} />
        <meshStandardMaterial color="#3b3a38" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0.16, 0.28, 0]} castShadow>
        <boxGeometry args={[0.2, 0.56, 0.24]} />
        <meshStandardMaterial color="#3b3a38" roughness={0.7} metalness={0.5} />
      </mesh>
      {/* torso */}
      <mesh position={[0, BODY_OFFSET, 0]} castShadow>
        <boxGeometry args={[0.72, 0.98, 0.46]} />
        <meshStandardMaterial
          ref={bodyMat}
          color="#5a5348"
          emissive="#c2410c"
          emissiveIntensity={0.25}
          roughness={0.55}
          metalness={0.65}
        />
      </mesh>
      {/* chest plate */}
      <mesh position={[0, BODY_OFFSET + 0.1, 0.25]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* arms + weapon */}
      <mesh position={[-0.48, BODY_OFFSET + 0.12, 0.05]} castShadow>
        <boxGeometry args={[0.16, 0.72, 0.18]} />
        <meshStandardMaterial color="#403c37" roughness={0.6} metalness={0.6} />
      </mesh>
      <mesh position={[0.48, BODY_OFFSET + 0.12, 0.05]} castShadow>
        <boxGeometry args={[0.16, 0.72, 0.18]} />
        <meshStandardMaterial color="#403c37" roughness={0.6} metalness={0.6} />
      </mesh>
      <mesh position={[0.4, BODY_OFFSET + 0.05, 0.42]} castShadow>
        <boxGeometry args={[0.1, 0.12, 0.6]} />
        <meshStandardMaterial color="#2b2926" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* head */}
      <mesh position={[0, HEAD_OFFSET - 0.15, 0]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial
          ref={headMat}
          color="#6b6152"
          emissive="#ff7a18"
          emissiveIntensity={0.4}
          roughness={0.45}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[0, HEAD_OFFSET - 0.15, 0.19]}>
        <boxGeometry args={[0.26, 0.07, 0.02]} />
        <meshStandardMaterial
          color="#ffb066"
          emissive="#ff8a2b"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Enemies() {
  const slots = useMemo(() => Array.from({ length: 7 }, (_, i) => i), []);
  const shotFrom = useRef(new THREE.Vector3());
  // bots only exist in solo/practice — multiplayer rooms are players-only
  const inRoom = useMultiplayer((s) => !!s.room?.id);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const store = useGame.getState();
    if (store.phase !== "playing") return;
    if (inRoom) {
      for (const e of world.enemies) {
        e.alive = false;
        e.deadFor = 0;
      }
      return;
    }
    const targets = collectTargets(useMultiplayer.getState().selfId);


    for (const e of world.enemies) {
      e.bob += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);

      if (!e.alive) {
        e.deadFor += dt;
        if (e.deadFor > 4) {
          e.alive = true;
          e.hp = e.maxHp;
          e.deadFor = 0;
          e.pos.copy(randomSpawn(world.playerPos));
          e.nextShot = 1 + Math.random() * 2;
        }
        continue;
      }

      // pick the closest human (local player or a remote room member)
      let target = targets[0]!;
      let best = Infinity;
      for (const t of targets) {
        const d2 = t.pos.distanceToSquared(e.pos);
        if (d2 < best) {
          best = d2;
          target = t;
        }
      }
      const isSelf = target.name === "self";

      EYE.set(e.pos.x, e.pos.y + HEAD_OFFSET - 0.2, e.pos.z);
      targetEye(target, TGT_EYE);
      const dist = EYE.distanceTo(TGT_EYE);
      const los = hasLineOfSight(EYE, TGT_EYE);

      // movement: close in when far, strafe when in range
      DIR.copy(target.pos).sub(e.pos);
      DIR.y = 0;
      const d = DIR.length() || 1;
      DIR.divideScalar(d);
      const speed = los ? (d > 16 ? 4.4 : 2.6) : 5;
      const strafe = new THREE.Vector3(-DIR.z, 0, DIR.x).multiplyScalar(
        Math.sin(e.bob * 0.9 + e.id) * (los ? 1 : 0.2),
      );
      const desired = new THREE.Vector3()
        .addScaledVector(DIR, d > 9 ? 1 : d < 6 ? -0.6 : 0)
        .add(strafe);
      if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speed * dt);

      // collide against arena boxes (axis separated)
      const tryMove = (ax: "x" | "z", amount: number) => {
        const next = e.pos.clone();
        next[ax] += amount;
        const box = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(next.x, 1, next.z),
          new THREE.Vector3(1.1, 2, 1.1),
        );
        if (!COLLIDERS.some((c) => c.intersectsBox(box))) e.pos[ax] = next[ax];
      };
      tryMove("x", desired.x);
      tryMove("z", desired.z);
      e.pos.x = THREE.MathUtils.clamp(e.pos.x, -30, 30);
      e.pos.z = THREE.MathUtils.clamp(e.pos.z, -30, 30);

      // shooting
      e.nextShot -= dt;
      if (los && dist < 45 && e.nextShot <= 0) {
        e.nextShot = 0.9 + Math.random() * 1.4;
        shotFrom.current.set(e.pos.x, e.pos.y + BODY_OFFSET + 0.2, e.pos.z);
        const accuracy = THREE.MathUtils.clamp(1 - dist / 60, 0.18, 0.62);
        const hit = Math.random() < accuracy;
        const aim = TGT_EYE.clone();
        if (!hit) {
          aim.x += (Math.random() - 0.5) * 3;
          aim.y += (Math.random() - 0.5) * 2;
          aim.z += (Math.random() - 0.5) * 3;
        }
        spawnTracer(shotFrom.current, aim, "#ff7a3d", 0.12);
        playEnemyShot(dist);
        // only the local client takes damage; remote hits play out visually for them
        if (hit && isSelf) {
          store.takeDamage(9 + Math.random() * 8);
          playHurt();
        }
      }
    }
  });

  if (inRoom) return null;

  return (
    <group>
      {slots.map((i) => (
        <EnemyModel key={i} index={i} />
      ))}
    </group>
  );
}

