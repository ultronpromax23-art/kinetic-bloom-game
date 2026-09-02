import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useMultiplayer } from "../../game/multiplayer";
import { BODY_OFFSET, HEAD_OFFSET, world } from "../../game/world";

const TMP = new THREE.Vector3();
const TMP_EYE = new THREE.Vector3();

interface RemoteTarget {
  pos: THREE.Vector3;
  yaw: number;
  name: string;
}

/**
 * Latest known world positions of every human in the match, including the
 * local player. Bots use this to pick the closest target each frame.
 */
export function collectTargets(selfId: string | null): RemoteTarget[] {
  const targets: RemoteTarget[] = [
    { pos: world.playerPos, yaw: 0, name: "self" },
  ];
  if (!selfId) return targets;
  for (const p of useMultiplayer.getState().players) {
    if (p.id === selfId) continue;
    const d = p.input_data;
    if (typeof d["x"] !== "number" || typeof d["z"] !== "number") continue;
    targets.push({
      pos: TMP.set(d["x"], typeof d["y"] === "number" ? d["y"] : 0, d["z"]).clone(),
      yaw: typeof d["yaw"] === "number" ? d["yaw"] : 0,
      name: p.username,
    });
  }
  return targets;
}

function RemotePlayerModel({ id }: { id: string }) {
  const group = useRef<THREE.Group>(null);
  const nameRef = useRef<THREE.Sprite>(null);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const mp = useMultiplayer.getState();
    const p = mp.players.find((pl) => pl.id === id);
    const d = p?.input_data;
    if (!p || typeof d?.["x"] !== "number" || typeof d["z"] !== "number") {
      g.visible = false;
      return;
    }
    g.visible = true;
    TMP.set(d["x"], typeof d["y"] === "number" ? d["y"] : 0, d["z"]);
    const k = 1 - Math.exp(-Math.min(rawDelta, 0.05) * 12);
    g.position.lerp(TMP, k);
    const targetYaw = typeof d["yaw"] === "number" ? d["yaw"] : 0;
    let dy = targetYaw - g.rotation.y;
    dy = ((dy + Math.PI) % (Math.PI * 2)) - Math.PI;
    g.rotation.y += dy * k;
    g.position.y += Math.sin(performance.now() / 300 + id.length) * 0.03;
  });

  return (
    <group ref={group}>
      {/* legs */}
      <mesh position={[-0.16, 0.28, 0]} castShadow>
        <boxGeometry args={[0.2, 0.56, 0.24]} />
        <meshStandardMaterial color="#2e3440" roughness={0.7} metalness={0.4} />
      </mesh>
      <mesh position={[0.16, 0.28, 0]} castShadow>
        <boxGeometry args={[0.2, 0.56, 0.24]} />
        <meshStandardMaterial color="#2e3440" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* torso */}
      <mesh position={[0, BODY_OFFSET, 0]} castShadow>
        <boxGeometry args={[0.72, 0.98, 0.46]} />
        <meshStandardMaterial
          color="#3f5a4a"
          emissive="#2f9e6e"
          emissiveIntensity={0.3}
          roughness={0.55}
          metalness={0.5}
        />
      </mesh>
      {/* chest plate */}
      <mesh position={[0, BODY_OFFSET + 0.1, 0.25]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#5a7a68" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* arms + weapon */}
      <mesh position={[-0.48, BODY_OFFSET + 0.12, 0.05]} castShadow>
        <boxGeometry args={[0.16, 0.72, 0.18]} />
        <meshStandardMaterial color="#33302c" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0.48, BODY_OFFSET + 0.12, 0.05]} castShadow>
        <boxGeometry args={[0.16, 0.72, 0.18]} />
        <meshStandardMaterial color="#33302c" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0.4, BODY_OFFSET + 0.05, 0.42]} castShadow>
        <boxGeometry args={[0.1, 0.12, 0.6]} />
        <meshStandardMaterial color="#26241f" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* head */}
      <mesh position={[0, HEAD_OFFSET - 0.15, 0]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial
          color="#4a6156"
          emissive="#39d98a"
          emissiveIntensity={0.5}
          roughness={0.45}
          metalness={0.6}
        />
      </mesh>
      {/* visor */}
      <mesh position={[0, HEAD_OFFSET - 0.15, 0.19]}>
        <boxGeometry args={[0.26, 0.07, 0.02]} />
        <meshStandardMaterial
          color="#8affc4"
          emissive="#2fe08a"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      {/* name sprite holder (kept for future nameplates) */}
      <sprite ref={nameRef} position={[0, HEAD_OFFSET + 0.45, 0]} visible={false} />
    </group>
  );
}

/**
 * Renders every other human in the room as a soldier in the arena, so
 * multiplayer matches show real players alongside the bots.
 */
export function RemotePlayers() {
  const players = useMultiplayer((s) => s.players);
  const selfId = useMultiplayer((s) => s.selfId);
  const inRoom = useMultiplayer((s) => !!s.room);
  if (!inRoom) return null;
  return (
    <group>
      {players
        .filter((p) => p.id !== selfId)
        .map((p) => (
          <RemotePlayerModel key={p.id} id={p.id} />
        ))}
    </group>
  );
}

/** Eye position of a target (for bot line-of-sight checks). */
export function targetEye(t: RemoteTarget, out: THREE.Vector3) {
  return out.set(t.pos.x, t.pos.y + 1.68, t.pos.z);
}
