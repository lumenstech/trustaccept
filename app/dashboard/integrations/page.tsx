import Link from "next/link";
import { CheckCircle2, Slack, XCircle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSlackConfig } from "@/src/server/env";
import { listSlackInstallations } from "@/src/server/slackInstallations";

export const dynamic = "force-dynamic";

const INTEGRATIONS = [
  { name: "Entra ID", category: "Identity", status: "connected" },
  { name: "Okta", category: "Identity", status: "available" },
  { name: "Auth0", category: "Identity", status: "available" },
  { name: "Fortify", category: "Vulnerability", status: "connected" },
  { name: "Snyk", category: "Vulnerability", status: "available" },
  { name: "Wiz", category: "Vulnerability", status: "available" },
  { name: "Tenable", category: "Vulnerability", status: "connected" },
  { name: "GitHub Actions", category: "Release pipelines", status: "connected" },
  { name: "GitLab CI", category: "Release pipelines", status: "available" },
  { name: "Cisco ISE", category: "Device & Network", status: "connected" },
  { name: "Armis", category: "Device & Network", status: "available" },
  { name: "ServiceNow", category: "ITSM", status: "available" },
  { name: "Jira", category: "ITSM", status: "available" },
  { name: "SequenceNow", category: "Approval delivery", status: "connected" },
];

export default function IntegrationsPage({
  searchParams,
}: {
  searchParams: { slack?: string; reason?: string; team?: string };
}) {
  const installs = listSlackInstallations();
  const cfg = getSlackConfig();
  const slackConfigured = Boolean(cfg.clientId && cfg.clientSecret && cfg.redirectUri);
  const slackStatus = searchParams.slack;

  return (
    <>
      <DashboardHeader
        eyebrow="Integrations"
        title="Connected systems"
        description="TrustAccept reads from the tools you already run. We do not replace them."
        actions={<Button>Connect new system</Button>}
      />

      <div className="space-y-6 px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Slack className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>TrustAccept for Slack</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Approve risky AI-agent actions directly in Slack before they happen.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {installs.length > 0 ? (
                  <Badge tone="success">
                    {installs.length} workspace{installs.length === 1 ? "" : "s"} connected
                  </Badge>
                ) : (
                  <Badge tone="neutral">Not connected</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {slackStatus === "connected" ? (
              <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                <span>
                  Slack connected
                  {searchParams.team ? ` to ${searchParams.team}` : ""}. Pending
                  decisions will be delivered to the channel selected during install.
                </span>
              </div>
            ) : null}
            {slackStatus === "error" ? (
              <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm">
                <XCircle className="mt-0.5 h-4 w-4 text-danger" />
                <span>
                  Slack install failed
                  {searchParams.reason ? `: ${decodeURIComponent(searchParams.reason)}` : "."}
                </span>
              </div>
            ) : null}

            {installs.length > 0 ? (
              <ul className="divide-y divide-border rounded-md border border-border">
                {installs.map((install) => (
                  <li
                    key={install.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{install.slackTeamName}</p>
                      <p className="text-xs text-muted-foreground">
                        Team {install.slackTeamId}
                        {install.defaultApprovalChannelName
                          ? ` · #${install.defaultApprovalChannelName}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Installed {new Date(install.installedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              {slackConfigured ? (
                <a href="/api/integrations/slack/install">
                  <Button>
                    <Slack className="h-4 w-4" />
                    {installs.length > 0 ? "Add another workspace" : "Install in Slack"}
                  </Button>
                </a>
              ) : (
                <Button
                  disabled
                  title="Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI"
                >
                  <Slack className="h-4 w-4" />
                  Configure Slack env vars
                </Button>
              )}
              <form action="/api/demo/slack-decision" method="post">
                <Button type="submit" variant="outline">
                  Send demo Slack approval
                </Button>
              </form>
              <Link
                href="/dashboard/decisions"
                className="text-sm text-primary hover:underline"
              >
                Open decision queue →
              </Link>
            </div>
            {!slackConfigured ? (
              <p className="text-xs text-muted-foreground">
                Slack OAuth is not configured. Set <code>SLACK_CLIENT_ID</code>,{" "}
                <code>SLACK_CLIENT_SECRET</code>, and <code>SLACK_REDIRECT_URI</code> in
                your environment. See <code>docs/slack-integration.md</code>.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((integration) => (
            <Card key={integration.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                  <Badge tone={integration.status === "connected" ? "success" : "neutral"}>
                    {integration.status === "connected" ? "Connected" : "Available"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{integration.category}</p>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full">
                  {integration.status === "connected" ? "Manage" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
