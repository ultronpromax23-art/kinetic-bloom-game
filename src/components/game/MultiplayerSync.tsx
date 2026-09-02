import { useEffect } from "react";
import { useMultiplayer } from "../../game/multiplayer";
import { useGame } from "../../game/store";
import { world } from "../../game/world";

/**
 * While a networked match is running, broadcast this player's position/actions
 * and score to everyone else in the room. Throttled to 10 Hz.
 */
export function MultiplayerSync() {
  const roomId = useMultiplayer((s) => s.room?.id);
  const selfId = useMultiplayer((s) => s.selfId);

  useEffect(() => {
    if (!roomId || !selfId) return;
    let lastScore = -1;

    const id = window.setInterval(() => {
      const g = useGame.getState();
      if (g.phase !== "playing") return;
      const mp = useMultiplayer.getState();

      void mp.sendInput({
        x: Number(world.playerPos.x.toFixed(2)),
        y: Number(world.playerPos.y.toFixed(2)),
        z: Number(world.playerPos.z.toFixed(2)),
        yaw: Number(world.view.yaw.toFixed(3)),
        weapon: g.current,
        health: Math.round(g.health),
        ads: g.ads,
      });

      if (g.score !== lastScore) {
        lastScore = g.score;
        void mp.sendScore(g.score);
      }
    }, 100);

    return () => window.clearInterval(id);
  }, [roomId, selfId]);

  return null;
}
