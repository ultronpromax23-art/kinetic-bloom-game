import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { world } from "../../game/world";

const MID = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export function Effects() {
  const tracerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const impactRefs = useRef<(THREE.Group | null)[]>([]);
  const tracerSlots = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const impactSlots = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    for (let i = world.tracers.length - 1; i >= 0; i--) {
      const tr = world.tracers[i];
      if (!tr) continue;
      tr.life -= dt;
      if (tr.life <= 0) world.tracers.splice(i, 1);
    }
    for (let i = world.impacts.length - 1; i >= 0; i--) {
      const im = world.impacts[i];
      if (!im) continue;
      im.life -= dt;
      if (im.life <= 0) world.impacts.splice(i, 1);
    }


    tracerSlots.forEach((i) => {
      const mesh = tracerRefs.current[i];
      if (!mesh) return;
      const t = world.tracers[i];
      if (!t) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const len = t.from.distanceTo(t.to);
      MID.copy(t.from).add(t.to).multiplyScalar(0.5);
      mesh.position.copy(MID);
      mesh.lookAt(t.to);
      const fade = t.life / t.max;
      mesh.scale.set(0.035 + fade * 0.02, 0.035 + fade * 0.02, len);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.set(t.color);
      mat.opacity = fade * 0.95;
    });

    impactSlots.forEach((i) => {
      const g = impactRefs.current[i];
      if (!g) return;
      const im = world.impacts[i];
      if (!im) {
        g.visible = false;
        return;
      }
      g.visible = true;
      g.position.copy(im.pos).addScaledVector(im.normal, 0.02);
      g.lookAt(MID.copy(im.pos).add(im.normal));
      const life = im.life / (im.flesh ? 0.35 : 0.5);
      const spark = g.children[0] as THREE.Mesh;
      const ring = g.children[1] as THREE.Mesh;
      const light = g.children[2] as THREE.PointLight;
      const s = (1 - life) * (im.flesh ? 1.4 : 1) + 0.2;
      spark.scale.setScalar(0.18 * (0.4 + life));
      ((spark.material as THREE.MeshBasicMaterial).color as THREE.Color).set(im.color);
      (spark.material as THREE.MeshBasicMaterial).opacity = life;
      ring.scale.setScalar(s);
      (ring.material as THREE.MeshBasicMaterial).opacity = life * 0.6;
      ((ring.material as THREE.MeshBasicMaterial).color as THREE.Color).set(im.color);
      light.intensity = life * (im.flesh ? 3 : 6);
      light.color.set(im.color);
    });
  });

  return (
    <group>
      {tracerSlots.map((i) => (
        <mesh
          key={`t${i}`}
          ref={(m) => {
            tracerRefs.current[i] = m;
          }}
          visible={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#ffb46b"
            transparent
            opacity={0.9}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {impactSlots.map((i) => (
        <group
          key={`i${i}`}
          ref={(g) => {
            impactRefs.current[i] = g;
          }}
          visible={false}
        >
          <mesh>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              transparent
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[0.12, 0.3, 16]} />
            <meshBasicMaterial
              transparent
              side={THREE.DoubleSide}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <pointLight distance={5} decay={2} intensity={0} />
        </group>
      ))}
    </group>
  );
}
