export interface UpstashCommandResult<T = unknown> {
  result?: T;
  error?: string;
}

export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function isUpstashRequired(): boolean {
  return process.env.TRUSTACCEPT_REQUIRE_UPSTASH === "1";
}

export async function upstashCommand<T = unknown>(
  command: string,
  ...args: string[]
): Promise<UpstashCommandResult<T>> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis REST env vars are not configured");
  }

  const path = [command, ...args].map(encodeURIComponent).join("/");
  const res = await fetch(`${url.replace(/\/+$/, "")}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const body = (await res.json()) as UpstashCommandResult<T>;
  if (!res.ok || body.error) {
    throw new Error(body.error ?? `Upstash command failed with HTTP ${res.status}`);
  }
  return body;
}

export async function getUpstashJson<T>(key: string): Promise<T | null> {
  const response = await upstashCommand<string | null>("GET", key);
  if (response.result == null) return null;
  return JSON.parse(response.result) as T;
}

export async function pingUpstash(): Promise<boolean> {
  const pong = await upstashCommand<string>("PING");
  return pong.result === "PONG" || pong.result === "OK";
}
