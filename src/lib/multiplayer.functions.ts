import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server-side multiplayer operations.
 *
 * The game is anonymous (no accounts), so authorization is capability-based:
 * a player's row id is an unguessable UUID that only the owning client knows,
 * and host-only actions verify the is_host flag on that row. All reads and
 * writes happen here with the service role because RLS on game_rooms/players
 * is locked down (no public policies).
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomRoomCode(): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

const usernameSchema = z
  .string()
  .trim()
  .max(24)
  .optional()
  .transform((s) => (s && s.length ? s : "Operator"));

const playerIdSchema = z.string().uuid();

const jsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((v) => JSON.stringify(v).length <= 4096, "payload too large");

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function getPlayer(playerId: string) {
  const db = await admin();
  const { data } = await db
    .from("players")
    .select("id, room_id, is_host")
    .eq("id", playerId)
    .maybeSingle();
  return data;
}

export const createRoomFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ username: usernameSchema }).parse(data))
  .handler(async ({ data }) => {
    const db = await admin();

    let room = null;
    for (let attempt = 0; attempt < 6 && !room; attempt++) {
      const { data: row, error } = await db
        .from("game_rooms")
        .insert({ room_code: randomRoomCode(), status: "waiting", game_state: {} })
        .select()
        .single();
      // 23505 = duplicate room_code, retry with a new code.
      if (error && error.code !== "23505") throw new Error("Failed to create room");
      if (row) room = row;
    }
    if (!room) throw new Error("Could not allocate a room code");

    const { data: me, error: pErr } = await db
      .from("players")
      .insert({ room_id: room.id, username: data.username, is_host: true })
      .select()
      .single();
    if (pErr) throw new Error("Failed to join room");

    return { room, selfId: me.id as string };
  });

export const joinRoomFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        code: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{4}$/, "Invalid room code"),
        username: usernameSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const db = await admin();

    const { data: room } = await db
      .from("game_rooms")
      .select("*")
      .eq("room_code", data.code)
      .maybeSingle();
    if (!room) throw new Error(`No room with code ${data.code}`);
    if (room.status === "finished") throw new Error("That match has ended");

    const { data: me, error: pErr } = await db
      .from("players")
      .insert({ room_id: room.id, username: data.username, is_host: false })
      .select()
      .single();
    if (pErr) throw new Error("Failed to join room");

    return { room, selfId: me.id as string };
  });

export const leaveRoomFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ playerId: playerIdSchema }).parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const me = await getPlayer(data.playerId);
    if (!me) return { ok: true };

    await db.from("players").delete().eq("id", me.id);
    // Host leaving closes the lobby for everyone.
    if (me.is_host) await db.from("game_rooms").delete().eq("id", me.room_id);
    return { ok: true };
  });

export const startGameFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ playerId: playerIdSchema }).parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const me = await getPlayer(data.playerId);
    if (!me || !me.is_host) throw new Error("Only the host can start the match");

    const { data: room } = await db
      .from("game_rooms")
      .select("game_state")
      .eq("id", me.room_id)
      .single();
    await db
      .from("game_rooms")
      .update({
        status: "playing",
        game_state: {
          ...(room?.game_state as object),
          startedAt: Date.now(),
        } as never,
      })
      .eq("id", me.room_id);
    return { ok: true };
  });

export const finishGameFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ playerId: playerIdSchema }).parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const me = await getPlayer(data.playerId);
    if (!me || !me.is_host) throw new Error("Only the host can finish the match");

    await db.from("game_rooms").update({ status: "finished" }).eq("id", me.room_id);
    return { ok: true };
  });

export const sendInputFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ playerId: playerIdSchema, input: jsonObjectSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await db
      .from("players")
      .update({ input_data: data.input as never })
      .eq("id", data.playerId);
    return { ok: true };
  });

export const sendScoreFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ playerId: playerIdSchema, score: z.number().int().min(0).max(1000000) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await db.from("players").update({ score: data.score }).eq("id", data.playerId);
    return { ok: true };
  });

export const patchGameStateFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ playerId: playerIdSchema, patch: jsonObjectSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const me = await getPlayer(data.playerId);
    if (!me || !me.is_host) throw new Error("Only the host can change match state");

    const { data: room } = await db
      .from("game_rooms")
      .select("game_state")
      .eq("id", me.room_id)
      .single();
    await db
      .from("game_rooms")
      .update({
        game_state: { ...((room?.game_state as object) ?? {}), ...data.patch } as never,
      })
      .eq("id", me.room_id);
    return { ok: true };
  });

/** Polled by clients in a room; authorized by the caller's own player id. */
export const getRoomStateFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ playerId: playerIdSchema }).parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const me = await getPlayer(data.playerId);
    if (!me) return { room: null, players: [] };

    const [{ data: room }, { data: players }] = await Promise.all([
      db.from("game_rooms").select("*").eq("id", me.room_id).maybeSingle(),
      db
        .from("players")
        .select("*")
        .eq("room_id", me.room_id)
        .order("created_at", { ascending: true }),
    ]);
    return { room: room ?? null, players: players ?? [] };
  });
