import { getStore } from "./store";
import type { SlackInstallation } from "./decisions/types";

let installationCounter = 0;
function generateInstallationId(): string {
  installationCounter += 1;
  return `slack-install-${Date.now().toString(36)}-${installationCounter.toString(36)}`;
}

export interface UpsertSlackInstallationInput {
  slackTeamId: string;
  slackTeamName: string;
  slackBotUserId: string;
  slackBotToken: string;
  defaultApprovalChannelId?: string | null;
  defaultApprovalChannelName?: string | null;
  installedBySlackUserId?: string | null;
}

export function upsertSlackInstallation(
  input: UpsertSlackInstallationInput,
): SlackInstallation {
  const store = getStore();
  const now = new Date().toISOString();
  const existing = store.slackInstallations.get(input.slackTeamId);
  const record: SlackInstallation = existing
    ? {
        ...existing,
        slackTeamName: input.slackTeamName,
        slackBotUserId: input.slackBotUserId,
        slackBotToken: input.slackBotToken,
        defaultApprovalChannelId:
          input.defaultApprovalChannelId ?? existing.defaultApprovalChannelId,
        defaultApprovalChannelName:
          input.defaultApprovalChannelName ?? existing.defaultApprovalChannelName,
        installedBySlackUserId:
          input.installedBySlackUserId ?? existing.installedBySlackUserId,
        updatedAt: now,
      }
    : {
        id: generateInstallationId(),
        slackTeamId: input.slackTeamId,
        slackTeamName: input.slackTeamName,
        slackBotUserId: input.slackBotUserId,
        slackBotToken: input.slackBotToken,
        defaultApprovalChannelId: input.defaultApprovalChannelId ?? null,
        defaultApprovalChannelName: input.defaultApprovalChannelName ?? null,
        installedBySlackUserId: input.installedBySlackUserId ?? null,
        installedAt: now,
        updatedAt: now,
      };
  store.slackInstallations.set(record.slackTeamId, record);
  return record;
}

export function getSlackInstallation(
  slackTeamId: string,
): SlackInstallation | null {
  return getStore().slackInstallations.get(slackTeamId) ?? null;
}

export function listSlackInstallations(): SlackInstallation[] {
  return Array.from(getStore().slackInstallations.values()).sort((a, b) =>
    a.installedAt.localeCompare(b.installedAt),
  );
}

/**
 * Returns the first available installation. Used by demo/seed flows when
 * the caller does not specify a Slack team. In production callers should
 * always pass slackTeamId explicitly.
 */
export function getDefaultInstallation(): SlackInstallation | null {
  const installs = listSlackInstallations();
  return installs[0] ?? null;
}
