import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  BODY_OFFSET,
  BODY_RADIUS,
  COLLIDERS,
  HEAD_OFFSET,
  HEAD_RADIUS,
  rayWorld,
  raySphere,
  spawnImpact,
  spawnTracer,
  world,
} from "../../game/world";
import { useGame } from "../../game/store";
import { WEAPONS, WEAPON_ORDER, type WeaponId } from "../../game/weapons";
import { useKeyboard } from "../../game/useKeyboard";
import {
  playDry,
  playFootstep,
  playHit,
  playKill,
  playReload,
  playShot,
  playSwitch,
} from "../../game/audio";

const STAND_EYE = 1.68;
const CROUCH_EYE = 1.05;
const RADIUS = 0.4;
const GRAVITY = 24;

const FWD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();
const MUZZLE = new THREE.Vector3();
const RAY = new THREE.Ray();
const SPHERE_C = new THREE.Vector3();

export function Player() {
  const { camera } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const vel = useRef(new THREE.Vector3());
  const grounded = useRef(true);
  const crouchT = useRef(0);
  const cooldown = useRef(0);
  const triggerDown = useRef(false);
  const firedThisPress = useRef(false);
  const reloadTimer = useRef(0);
  const stepAccum = useRef(0);

  const keys = useKeyboard((code) => {
    const s = useGame.getState();
    if (code === "Escape") {
      s.toMenu();
      return;
    }
    if (s.phase !== "playing") return;
    if (code === "KeyR") startReload();
    const digit = /^Digit([1-5])$/.exec(code);
    if (digit) {
      const id = WEAPON_ORDER[Number(digit[1]) - 1];
      if (id && id !== s.current) switchTo(id);
    }
  });

  function switchTo(id: WeaponId) {
    reloadTimer.current = 0;
    cooldown.current = 0.35;
    useGame.getState().setCurrent(id);
    playSwitch();
  }

  function startReload() {
    const s = useGame.getState();
    const def = WEAPONS[s.current];
    const a = s.ammo[s.current];
    if (s.reloading || a.mag >= def.magSize || a.reserve <= 0) return;
    s.setReloading(true);
    reloadTimer.current = def.reloadTime;
    playReload();
  }

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (document.pointerLockElement === null) return;
      if (e.button === 0) {
        triggerDown.current = true;
        firedThisPress.current = false;
      }
      if (e.button === 2) useGame.getState().setAds(true);
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) triggerDown.current = false;
      if (e.button === 2) useGame.getState().setAds(false);
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement === null) return;
      const s = useGame.getState();
      const sens = (s.ads ? 0.0011 : 0.0022) * s.settings.sensitivity;
      const invert = s.settings.invertY ? -1 : 1;
      yaw.current -= e.movementX * sens;
      pitch.current -= e.movementY * sens * invert;
      pitch.current = THREE.MathUtils.clamp(pitch.current, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
      world.view.yaw = yaw.current;
    };
    const onWheel = (e: WheelEvent) => {
      if (document.pointerLockElement === null) return;
      const s = useGame.getState();
      const idx = WEAPON_ORDER.indexOf(s.current);
      const next = WEAPON_ORDER[(idx + (e.deltaY > 0 ? 1 : WEAPON_ORDER.length - 1)) % WEAPON_ORDER.length];
      if (next) switchTo(next);
    };

    const onCtx = (e: Event) => e.preventDefault();
    const onLockChange = () => {
      if (document.pointerLockElement === null) {
        triggerDown.current = false;
        useGame.getState().setAds(false);
      }
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("contextmenu", onCtx);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, []);

  function fire() {
    const s = useGame.getState();
    const def = WEAPONS[s.current];
    const ammo = s.ammo[s.current];
    if (ammo.mag <= 0) {
      playDry();
      cooldown.current = 0.35;
      if (ammo.reserve > 0) startReload();
      return;
    }
    s.spendRound();
    playShot(def);

    const spread = s.ads ? def.adsSpread : def.spread * (grounded.current ? 1 : 1.8);
    camera.getWorldDirection(FWD);
    RIGHT.crossVectors(FWD, camera.up).normalize();
    const upV = new THREE.Vector3().crossVectors(RIGHT, FWD).normalize();

    MUZZLE.copy(camera.position)
      .addScaledVector(RIGHT, s.ads ? 0.0 : 0.22)
      .addScaledVector(upV, -0.16)
      .addScaledVector(FWD, 0.7);

    for (let p = 0; p < def.pellets; p++) {
      const dir = FWD.clone();
      if (spread > 0) {
        const ang = Math.random() * Math.PI * 2;
        const mag = Math.sqrt(Math.random()) * spread;
        dir.addScaledVector(RIGHT, Math.cos(ang) * mag).addScaledVector(upV, Math.sin(ang) * mag);
        dir.normalize();
      }
      RAY.set(camera.position, dir);

      const worldHit = rayWorld(RAY, def.range);
      let bestT = worldHit ? worldHit.dist : def.range;
      let hitEnemy: (typeof world.enemies)[number] | null = null;
      let head = false;

      for (const e of world.enemies) {
        if (!e.alive) continue;
        SPHERE_C.set(e.pos.x, e.pos.y + HEAD_OFFSET - 0.15, e.pos.z);
        const th = raySphere(RAY, SPHERE_C, HEAD_RADIUS);
        SPHERE_C.set(e.pos.x, e.pos.y + BODY_OFFSET, e.pos.z);
        const tb = raySphere(RAY, SPHERE_C, BODY_RADIUS);
        const t = th !== null && (tb === null || th < tb) ? th : tb;
        if (t === null || t >= bestT) continue;
        bestT = t;
        hitEnemy = e;
        head = th !== null && t === th;
      }

      const end = RAY.at(bestT, new THREE.Vector3());
      spawnTracer(MUZZLE, end, def.tracer, def.id === "sniper" ? 0.14 : 0.08);

      if (hitEnemy) {
        const falloff = THREE.MathUtils.clamp(1 - bestT / (def.range * 1.6), 0.45, 1);
        const dmg = def.damage * (head ? def.headMult : 1) * falloff;
        hitEnemy.hp -= dmg;
        hitEnemy.hitFlash = 1;
        spawnImpact(end, FWD.clone().negate(), head ? "#ffd166" : "#ff5f3d", true);
        if (hitEnemy.hp <= 0) {
          hitEnemy.alive = false;
          hitEnemy.deadFor = 0;
          useGame.getState().registerHit(head, true, hitEnemy.name);
          playKill();
        } else {
          useGame.getState().registerHit(head, false, hitEnemy.name);
          playHit(head);
        }
      } else if (worldHit && bestT === worldHit.dist) {
        spawnImpact(worldHit.point, worldHit.normal, "#ffd6a0");
      }
    }

    // recoil
    const kick = def.recoil * (useGame.getState().ads ? 0.6 : 1);
    pitch.current = Math.min(Math.PI / 2 - 0.02, pitch.current + kick * 0.8);
    world.view.recoilKick += kick * 2.2;
    world.view.flash = 0.05;
    cooldown.current = 60 / def.rpm;
    if (useGame.getState().ammo[s.current].mag <= 0) startReload();
  }

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = useGame.getState();
    const def = WEAPONS[s.current];
    const k = keys.current;
    const locked = typeof document !== "undefined" && document.pointerLockElement !== null;

    world.view.recoilKick *= Math.exp(-11 * dt);
    world.view.flash = Math.max(0, world.view.flash - dt);

    if (s.phase === "playing") useGame.getState().regen(dt);

    if (s.phase !== "playing") {
      camera.position.copy(world.playerEye);
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
      return;
    }

    // reload
    if (s.reloading) {
      reloadTimer.current -= dt;
      if (reloadTimer.current <= 0) s.finishReload();
    }

    // ---- movement ----
    const crouching = k.has("ControlLeft") || k.has("ControlRight") || k.has("KeyC");
    crouchT.current += ((crouching ? 1 : 0) - crouchT.current) * (1 - Math.exp(-12 * dt));

    const fwdIn = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    const strafeIn = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const sprinting =
      (k.has("ShiftLeft") || k.has("ShiftRight")) && fwdIn > 0 && !crouching && !s.ads;

    FWD.set(Math.sin(yaw.current) * -1, 0, Math.cos(yaw.current) * -1).normalize();
    RIGHT.set(-FWD.z, 0, FWD.x).normalize();
    MOVE.set(0, 0, 0).addScaledVector(FWD, fwdIn).addScaledVector(RIGHT, strafeIn);

    let speed = 6.4;
    if (sprinting) speed = 10;
    if (crouching) speed = 3.2;
    if (s.ads) speed *= 0.55;
    if (!grounded.current) speed *= 0.9;

    if (MOVE.lengthSq() > 0) MOVE.normalize().multiplyScalar(speed * dt);

    const eyeHeight = THREE.MathUtils.lerp(STAND_EYE, CROUCH_EYE, crouchT.current);
    const bodyHeight = eyeHeight + 0.15;

    const collides = (x: number, z: number, y: number) => {
      const box = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, y + bodyHeight / 2, z),
        new THREE.Vector3(RADIUS * 2, bodyHeight, RADIUS * 2),
      );
      return COLLIDERS.some((c) => c.intersectsBox(box));
    };

    const p = world.playerPos;
    if (!collides(p.x + MOVE.x, p.z, p.y)) p.x += MOVE.x;
    if (!collides(p.x, p.z + MOVE.z, p.y)) p.z += MOVE.z;
    p.x = THREE.MathUtils.clamp(p.x, -30.5, 30.5);
    p.z = THREE.MathUtils.clamp(p.z, -30.5, 30.5);

    // vertical: find support surface under player
    let groundY = 0;
    for (const c of COLLIDERS) {
      if (
        p.x > c.min.x - RADIUS &&
        p.x < c.max.x + RADIUS &&
        p.z > c.min.z - RADIUS &&
        p.z < c.max.z + RADIUS &&
        c.max.y <= p.y + 0.35 &&
        c.max.y > groundY
      ) {
        groundY = c.max.y;
      }
    }

    if (grounded.current && k.has("Space")) {
      vel.current.y = 8.4;
      grounded.current = false;
    }
    vel.current.y -= GRAVITY * dt;
    p.y += vel.current.y * dt;
    if (p.y <= groundY) {
      p.y = groundY;
      vel.current.y = 0;
      grounded.current = true;
    }

    // head bob + footsteps
    const moving = MOVE.lengthSq() > 0 && grounded.current;
    if (moving) {
      world.view.bob += dt * (sprinting ? 15 : crouching ? 6 : 10);
      stepAccum.current += dt * (sprinting ? 2.6 : crouching ? 1.1 : 1.8);
      if (stepAccum.current > 1) {
        stepAccum.current = 0;
        playFootstep(sprinting);
      }
    }
    world.view.sway += (strafeIn * -0.05 - world.view.sway) * (1 - Math.exp(-8 * dt));

    const bobY = moving ? Math.sin(world.view.bob * 2) * (sprinting ? 0.045 : 0.025) : 0;
    world.playerEye.set(p.x, p.y + eyeHeight + bobY, p.z);
    camera.position.copy(world.playerEye);
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    // fov: ads zoom + sprint widen
    const targetFov = s.ads ? def.adsFov : sprinting ? s.settings.fov + 4 : s.settings.fov;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov += (targetFov - cam.fov) * (1 - Math.exp(-12 * dt));
    cam.updateProjectionMatrix();

    // ---- shooting ----
    cooldown.current -= dt;
    if (locked && triggerDown.current && cooldown.current <= 0 && !s.reloading) {
      if (def.auto || !firedThisPress.current) {
        firedThisPress.current = true;
        fire();
      }
    }
  });

  return null;
}
