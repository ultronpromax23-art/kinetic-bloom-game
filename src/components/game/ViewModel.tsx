import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { world } from "../../game/world";
import { useGame } from "../../game/store";
import { WEAPONS } from "../../game/weapons";

const OFFSET = new THREE.Vector3();
const HIP = new THREE.Vector3(0.26, -0.24, -0.55);
const ADS = new THREE.Vector3(0, -0.13, -0.42);

export function ViewModel() {
  const group = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Group>(null);
  const current = useGame((s) => s.current);
  const ads = useGame((s) => s.ads);
  const reloading = useGame((s) => s.reloading);
  const def = WEAPONS[current];
  const lerped = useRef(0);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const cam = state.camera;

    lerped.current += (((ads ? 1 : 0) as number) - lerped.current) * (1 - Math.exp(-14 * dt));
    const a = lerped.current;

    OFFSET.copy(HIP).lerp(ADS, a);
    // recoil kick pushes the gun back and up
    OFFSET.z += world.view.recoilKick * 0.35;
    OFFSET.y += world.view.recoilKick * 0.12;
    // walk bob
    OFFSET.x += Math.sin(world.view.bob) * 0.012 * (1 - a);
    OFFSET.y += Math.abs(Math.cos(world.view.bob)) * 0.012 * (1 - a);
    // reload dip
    if (reloading) {
      OFFSET.y -= 0.22;
      OFFSET.z += 0.06;
    }

    g.position.copy(cam.position);
    g.quaternion.copy(cam.quaternion);
    g.translateX(OFFSET.x);
    g.translateY(OFFSET.y);
    g.translateZ(OFFSET.z);
    g.rotation.z = world.view.sway * 0.4 * (1 - a);
    if (reloading) {
      g.rotateX(-0.45);
      g.rotateZ(0.25);
    }
    g.rotateX(world.view.recoilKick * 0.6);

    if (flashRef.current) {
      const on = world.view.flash > 0;
      flashRef.current.visible = on;
      if (on) {
        const s = 0.6 + world.view.flash * 3;
        flashRef.current.scale.set(s, s, s + Math.random() * 0.6);
        flashRef.current.rotation.z = Math.random() * Math.PI;
      }
    }
  });

  const [bl, bh, bw] = def.body;
  const [barLen, barR] = def.barrel;

  return (
    <group ref={group} renderOrder={10}>
      <group scale={ads && def.scope ? 0.9 : 1}>
        {/* receiver */}
        <mesh position={[0, 0, -bl / 2]}>
          <boxGeometry args={[bw, bh, bl]} />
          <meshStandardMaterial color="#33312e" roughness={0.45} metalness={0.85} />
        </mesh>
        {/* upper rail */}
        <mesh position={[0, bh / 2 + 0.012, -bl / 2 - 0.02]}>
          <boxGeometry args={[bw * 0.55, 0.024, bl * 0.75]} />
          <meshStandardMaterial color="#26241f" roughness={0.4} metalness={0.9} />
        </mesh>
        {/* barrel */}
        <mesh position={[0, 0.005, -bl - barLen / 2 + 0.05]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[barR, barR, barLen, 10]} />
          <meshStandardMaterial color="#1f1e1c" roughness={0.35} metalness={0.95} />
        </mesh>
        {/* grip */}
        <mesh position={[0, -bh * 0.7, -bl * 0.28]} rotation-x={-0.25}>
          <boxGeometry args={[bw * 0.8, bh * 1.25, bh * 0.72]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.85} metalness={0.15} />
        </mesh>
        {/* magazine */}
        <mesh position={[0, -bh * 0.75, -bl * 0.62]} rotation-x={0.12}>
          <boxGeometry args={[bw * 0.7, bh * 1.5, bh * 0.6]} />
          <meshStandardMaterial color="#2c2a26" roughness={0.6} metalness={0.7} />
        </mesh>
        {/* stock */}
        {def.id !== "pistol" && (
          <mesh position={[0, -0.01, 0.14]}>
            <boxGeometry args={[bw * 0.8, bh * 1.05, 0.28]} />
            <meshStandardMaterial color="#3d3a34" roughness={0.7} metalness={0.4} />
          </mesh>
        )}
        {/* scope */}
        {def.scope && (
          <group position={[0, bh * 0.62, -bl * 0.55]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.045, 0.045, 0.3, 12]} />
              <meshStandardMaterial color="#1c1b19" roughness={0.3} metalness={0.9} />
            </mesh>
            <mesh position={[0, 0, -0.16]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
              <meshStandardMaterial
                color="#9fd6ff"
                emissive="#5aa9e6"
                emissiveIntensity={1.2}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}
        {/* accent strip */}
        <mesh position={[bw / 2 + 0.001, -0.01, -bl * 0.55]}>
          <boxGeometry args={[0.004, 0.02, bl * 0.4]} />
          <meshStandardMaterial
            color="#e08a3c"
            emissive="#e0722c"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>

        {/* muzzle flash */}
        <group ref={flashRef} position={[0, 0.005, -bl - barLen + 0.02]} visible={false}>
          <mesh>
            <coneGeometry args={[0.07, 0.22, 6]} rotation-x={-Math.PI / 2} />
            <meshBasicMaterial
              color="#ffd28a"
              transparent
              opacity={0.95}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation-y={Math.PI / 2}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial
              color="#ffb04d"
              transparent
              opacity={0.7}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <pointLight color="#ffb257" intensity={12} distance={12} decay={2} />
        </group>
      </group>
    </group>
  );
}
