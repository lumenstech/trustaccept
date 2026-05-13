/**
 * Centralized access for runtime configuration. Values are read lazily so
 * tests can mutate process.env between cases. Never log the returned values.
 */

export interface SlackConfig {
  clientId: string | null;
  clientSecret: string | null;
  signingSecret: string | null;
  botToken: string | null;
  redirectUri: string | null;
}

export function getSlackConfig(): SlackConfig {
  return {
    clientId: process.env.SLACK_CLIENT_ID ?? null,
    clientSecret: process.env.SLACK_CLIENT_SECRET ?? null,
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? null,
    botToken: process.env.SLACK_BOT_TOKEN ?? null,
    redirectUri: process.env.SLACK_REDIRECT_URI ?? null,
  };
}

export function requireSlackOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const cfg = getSlackConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    throw new Error(
      "Slack OAuth is not configured. Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and SLACK_REDIRECT_URI.",
    );
  }
  return {
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    redirectUri: cfg.redirectUri,
  };
}

export function requireSlackSigningSecret(): string {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    throw new Error("SLACK_SIGNING_SECRET is not configured");
  }
  return secret;
}

export function getTrustAcceptAppUrl(): string {
  return process.env.TRUSTACCEPT_APP_URL ?? "http://localhost:3000";
}

export function getTrustAcceptWebhookSecret(): string | null {
  return process.env.TRUSTACCEPT_WEBHOOK_SECRET ?? null;
}
