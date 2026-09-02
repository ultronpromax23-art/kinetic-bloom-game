import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { Arena } from "./Arena";
import { Enemies } from "./Enemies";
import { Effects } from "./Effects";
import { Player } from "./Player";
import { ViewModel } from "./ViewModel";
import { RemotePlayers } from "./RemotePlayers";
import { HUD } from "./HUD";
import { resetWorld, world } from "../../game/world";
import { useGame } from "../../game/store";
import { playDeath, unlockAudio } from "../../game/audio";

export function GameCanvas() {
  const container = useRef<HTMLDivElement>(null);
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    resetWorld();
    world.playerPos.set(0, 0, 22);
    world.playerEye.set(0, 1.68, 22);
  }, []);

  useEffect(() => {
    if (phase === "dead") {
      playDeath();
    }
    if ((phase === "dead" || phase === "menu") && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [phase]);

  const lock = useCallback(() => {
    unlockAudio();
    const el = container.current;
    if (!el) return;
    if (useGame.getState().phase === "playing" && !document.pointerLockElement) {
      void el.requestPointerLock();
    }
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    el.addEventListener("click", lock);
    return () => el.removeEventListener("click", lock);
  }, [lock]);

  return (
    <div ref={container} className="fixed inset-0 cursor-crosshair bg-arena-sky">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.68, 22], fov: 78, near: 0.05, far: 400 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.25;
        }}
      >
        <color attach="background" args={["#5b6470"]} />
        <fog attach="fog" args={["#5b6470", 22, 105]} />

        <ambientLight intensity={1.4} color="#c4d0e0" />
        <hemisphereLight args={["#b6c6d8", "#4a5640", 2.2]} />
        <directionalLight
          position={[30, 46, 20]}
          intensity={2.1}
          color="#d6e2f0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
          shadow-camera-far={120}
        />

        <Suspense fallback={null}>
          <Environment>
            <Lightformer intensity={1.6} color="#b8c9dc" position={[0, 14, 0]} scale={[26, 26, 1]} rotation-x={Math.PI / 2} />
            <Lightformer intensity={0.5} color="#6c7f96" position={[-14, 4, -8]} rotation-y={Math.PI / 2} scale={[30, 6, 1]} />
            <Lightformer intensity={0.4} color="#3f5136" position={[14, 4, 8]} rotation-y={-Math.PI / 2} scale={[30, 6, 1]} />
          </Environment>

          <Arena />
          <Enemies />
          <RemotePlayers />
          <Effects />
          <ViewModel />
          <Player />
        </Suspense>
      </Canvas>

      <HUD onResume={lock} />
    </div>
  );
}
