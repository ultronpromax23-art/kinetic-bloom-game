import { useMemo } from "react";
import * as THREE from "three";
import { BOXES, TREES, ARENA_SIZE, ROAD_HALF_WIDTH } from "../../game/world";
import {
  asphaltTexture,
  groundTexture,
  concreteTexture,
  facadeTexture,
  barkTexture,
  panelTexture,
} from "../../game/textures";

export function Arena() {
  const roadTex = useMemo(() => asphaltTexture(10), []);
  const grassTex = useMemo(() => groundTexture(16), []);
  const walkTex = useMemo(() => concreteTexture(24), []);
  const facadeA = useMemo(() => facadeTexture("#6b6157", 0.25), []);
  const facadeB = useMemo(() => facadeTexture("#5a5048", 0.16), []);
  const crateTex = useMemo(() => panelTexture("#5c5347", "#7a4b28", 1), []);
  const bark = useMemo(() => barkTexture(), []);

  const mats = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({ color: "#3b3a36", roughness: 0.95, metalness: 0.05 }),
      building: new THREE.MeshStandardMaterial({ map: facadeA, roughness: 0.9, metalness: 0.05 }),
      buildingAlt: new THREE.MeshStandardMaterial({ map: facadeB, roughness: 0.92, metalness: 0.05 }),
      crate: new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.85, metalness: 0.1 }),
      pillar: new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.95, metalness: 0.04 }),
      ramp: new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.85, metalness: 0.1 }),
      curb: new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.9, metalness: 0.03, color: "#8d897f" }),
      trunk: new THREE.MeshStandardMaterial({ map: bark, roughness: 1, metalness: 0 }),
      leafA: new THREE.MeshStandardMaterial({ color: "#2c4426", roughness: 1, flatShading: true }),
      leafB: new THREE.MeshStandardMaterial({ color: "#3a5230", roughness: 1, flatShading: true }),
    }),
    [facadeA, facadeB, crateTex, walkTex, bark],
  );

  return (
    <group>
      {/* forest floor covers the whole arena */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial map={grassTex} roughness={1} metalness={0} color="#8c9c7c" />
      </mesh>

      {/* wet asphalt street */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[ROAD_HALF_WIDTH * 2, ARENA_SIZE]} />
        <meshStandardMaterial map={roadTex} roughness={0.45} metalness={0.15} color="#a5a59e" />
      </mesh>
      {/* lane markings */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh
          key={`lane${i}`}
          rotation-x={-Math.PI / 2}
          position={[0, 0.03, -ARENA_SIZE / 2 + 3 + i * 4.6]}
        >
          <planeGeometry args={[0.3, 2.2]} />
          <meshBasicMaterial color="#c9c2ad" transparent opacity={0.45} />
        </mesh>
      ))}
      {/* sidewalks */}
      {[-1, 1].map((s) => (
        <mesh
          key={`sw${s}`}
          rotation-x={-Math.PI / 2}
          position={[s * (ROAD_HALF_WIDTH + 1.2), 0.03, 0]}
          receiveShadow
        >
          <planeGeometry args={[2.8, ARENA_SIZE - 4]} />
          <meshStandardMaterial map={walkTex} roughness={0.85} metalness={0.04} color="#9b968b" />
        </mesh>
      ))}

      {BOXES.map((b, i) => (
        <mesh
          key={i}
          position={b.pos}
          castShadow
          receiveShadow
          material={
            b.kind === "building" ? (i % 2 ? mats.buildingAlt : mats.building) : mats[b.kind]
          }
        >
          <boxGeometry args={b.size} />
        </mesh>
      ))}

      {/* forest */}
      {TREES.map((t, i) => (
        <group key={`t${i}`} position={[t.pos[0], 0, t.pos[1]]} rotation-z={t.tilt}>
          <mesh position={[0, t.height / 2, 0]} castShadow material={mats.trunk}>
            <cylinderGeometry args={[t.radius * 0.7, t.radius, t.height, 7]} />
          </mesh>
          <mesh
            position={[0, t.height * 0.78, 0]}
            castShadow
            material={i % 2 ? mats.leafA : mats.leafB}
          >
            <icosahedronGeometry args={[t.height * 0.3, 0]} />
          </mesh>
          <mesh
            position={[0, t.height * 1.02, 0]}
            castShadow
            material={i % 2 ? mats.leafB : mats.leafA}
          >
            <icosahedronGeometry args={[t.height * 0.21, 0]} />
          </mesh>
        </group>
      ))}

      {/* street lamps along the road */}
      {[-24, -8, 8, 24].map((z, i) => (
        <group key={`lamp${i}`} position={[ROAD_HALF_WIDTH + 1.2, 0, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.14, 0.2, 7, 8]} />
            <meshStandardMaterial color="#1d1e1c" roughness={0.6} metalness={0.6} />
          </mesh>
          <mesh position={[-1.4, 3.4, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.1, 0.1, 2.8, 8]} />
            <meshStandardMaterial color="#1d1e1c" roughness={0.6} metalness={0.6} />
          </mesh>
          <mesh position={[-2.7, 3.25, 0]}>
            <sphereGeometry args={[0.32, 12, 10]} />
            <meshStandardMaterial
              color="#ffe0ae"
              emissive="#ffbf72"
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            color="#ffca8a"
            intensity={26}
            distance={22}
            decay={2}
            position={[-2.7, 3, 0]}
            castShadow={false}
          />
        </group>
      ))}
    </group>
  );
}
