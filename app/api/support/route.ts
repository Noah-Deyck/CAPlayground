import { NextRequest } from "next/server";

const DISCORD_API = "https://discord.com/api/v10";

function env(name: string): string | undefined {
  return process.env[name];
}

async function discord(path: string, init?: RequestInit): Promise<Response> {
  const token = env("DISCORD_BOT_TOKEN");
  if (!token) return new Response(JSON.stringify({ error: "Missing DISCORD_BOT_TOKEN" }), { status: 500 });
  return fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

async function resolveSupportChannels(): Promise<string[]> {
  const list = env("DISCORD_CHANNEL_IDS");
  if (list) return list.split(",").map((s) => s.trim()).filter(Boolean);
  const guildId = env("DISCORD_GUILD_ID");
  if (!guildId) return [];
  const res = await discord(`/guilds/${guildId}/channels`);
  if (!res.ok) return [];
  const channels = await res.json();
  const names = new Set(["cap-1", "cap-2", "cap-3", "cap-4", "cap-5"]);
  return channels.filter((c: any) => names.has(c.name)).map((c: any) => c.id as string);
}

async function getLastMessage(channelId: string): Promise<{ content: string; timestamp: number } | null> {
  const res = await discord(`/channels/${channelId}/messages?limit=1`);
  if (!res.ok) return null;
  const arr = await res.json();
  if (!Array.isArray(arr) || !arr.length) return null;
  const m = arr[0];
  return { content: String(m.content || ""), timestamp: Date.parse(m.timestamp || m.edited_timestamp || 0) || 0 };
}

async function chooseChannel(): Promise<string | null> {
  const ids = await resolveSupportChannels();
  if (!ids.length) return null;
  const statuses = await Promise.all(ids.map(async (id) => ({ id, last: await getLastMessage(id) })));
  const available = statuses.find((s) => s.last && s.last.content.trim() === "!clear");
  if (available) return available.id;
  const never = statuses.find((s) => !s.last);
  if (never) return never.id;
  statuses.sort((a, b) => (a.last!.timestamp || 0) - (b.last!.timestamp || 0));
  return statuses[0]?.id ?? null;
}

async function postMessage(channelId: string, content: string): Promise<boolean> {
  const res = await discord(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  try {
    const { text, email, newSession } = await req.json();
    if (!text || typeof text !== "string") return new Response(JSON.stringify({ error: "Missing text" }), { status: 400 });
    const label = email && typeof email === "string" ? email : "Anonymous user";

    const webhook = env("DISCORD_WEBHOOK_URL");
    if (webhook) {
      const prefix = text.trim() !== "!clear" && (newSession === true || newSession === "1") ? "@everyone " : "";
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `${prefix}[${label}] ${text}` }),
      });
      if (!res.ok) return new Response(JSON.stringify({ error: "Failed to send webhook" }), { status: 502 });
      let note = undefined as string | undefined;
      if (text.trim() === "!clear") note = "This thread was closed.";
      return new Response(JSON.stringify({ ok: true, note }), { status: 200 });
    }

    const id = await chooseChannel();
    if (!id) return new Response(JSON.stringify({ error: "No support channels available" }), { status: 503 });
    const ok = await postMessage(id, `[${label}] ${text}`);
    if (!ok) return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 502 });
    let note = undefined as string | undefined;
    if (text.trim() === "!clear") note = "This thread was closed.";
    return new Response(JSON.stringify({ ok: true, channelId: id, note }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { status: 500 });
  }
}
