import { create } from "zustand";
import type { Json } from "@/integrations/supabase/types";
import {
  createRoomFn,
  joinRoomFn,
  leaveRoomFn,
  startGameFn,
  finishGameFn,
  sendInputFn,
  sendScoreFn,
  patchGameStateFn,
  getRoomStateFn,
} from "../lib/multiplayer.functions";

export type JsonObject = { [key: string]: Json | undefined };

export type RoomStatus = "waiting" | "playing" | "finished";

export interface GameRoom {
  id: string;
  room_code: string;
  status: RoomStatus;
  game_state: JsonObject;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  username: string;
  score: number;
  input_data: JsonObject;
  is_host: boolean;
  created_at: string;
}

interface MultiplayerState {
  room: GameRoom | null;
  players: RoomPlayer[];
  selfId: string | null;
  connecting: boolean;
  error: string | null;

  createRoom: (username: string) => Promise<void>;
  joinRoom: (code: string, username: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  finishGame: () => Promise<void>;
  /** Push this player's live coordinates / actions to everyone in the room. */
  sendInput: (input: JsonObject) => Promise<void>;
  /** Push this player's score to everyone in the room. */
  sendScore: (score: number) => Promise<void>;
  /** Push shared match variables (round, timer, objectives…). */
  patchGameState: (patch: JsonObject) => Promise<void>;
  clearError: () => void;
}

function message(e: unknown, fallback: string) {
  return e && typeof e === "object" && "message" in e ? String((e as Error).message) : fallback;
}

let pollTimer: number | null = null;

export const useMultiplayer = create<MultiplayerState>((set, get) => {
  function stopPolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /** Poll the room state; authorized server-side by this client's player id. */
  function startPolling() {
    stopPolling();
    pollTimer = window.setInterval(async () => {
      const { selfId } = get();
      if (!selfId) {
        stopPolling();
        return;
      }
      try {
        const { room, players } = await getRoomStateFn({ data: { playerId: selfId } });
        if (!room) {
          // Room was deleted (host left) — drop back to solo.
          stopPolling();
          set({ room: null, players: [], selfId: null });
          return;
        }
        set({ room: room as GameRoom, players: players as RoomPlayer[] });
      } catch {
        // Transient network error — keep polling.
      }
    }, 400);
  }

  return {
    room: null,
    players: [],
    selfId: null,
    connecting: false,
    error: null,

    clearError: () => set({ error: null }),

    createRoom: async (username) => {
      set({ connecting: true, error: null });
      try {
        const { room, selfId } = await createRoomFn({ data: { username } });
        set({ room: room as GameRoom, selfId, connecting: false });
        startPolling();
      } catch (e) {
        set({ connecting: false, error: message(e, "Failed to create room") });
      }
    },

    joinRoom: async (code, username) => {
      set({ connecting: true, error: null });
      try {
        const { room, selfId } = await joinRoomFn({
          data: { code: code.trim().toUpperCase(), username },
        });
        set({ room: room as GameRoom, selfId, connecting: false });
        startPolling();
      } catch (e) {
        set({ connecting: false, error: message(e, "Failed to join room") });
      }
    },

    leaveRoom: async () => {
      const { selfId } = get();
      stopPolling();
      set({ room: null, players: [], selfId: null, error: null });
      if (selfId) await leaveRoomFn({ data: { playerId: selfId } });
    },

    startGame: async () => {
      const { selfId } = get();
      if (!selfId) return;
      try {
        await startGameFn({ data: { playerId: selfId } });
      } catch (e) {
        set({ error: message(e, "Failed to start match") });
      }
    },

    finishGame: async () => {
      const { selfId } = get();
      if (!selfId) return;
      await finishGameFn({ data: { playerId: selfId } });
    },

    sendInput: async (input) => {
      const { selfId } = get();
      if (!selfId) return;
      await sendInputFn({ data: { playerId: selfId, input } });
    },

    sendScore: async (score) => {
      const { selfId } = get();
      if (!selfId) return;
      await sendScoreFn({ data: { playerId: selfId, score } });
    },

    patchGameState: async (patch) => {
      const { selfId } = get();
      if (!selfId) return;
      await patchGameStateFn({ data: { playerId: selfId, patch } });
    },
  };
});
