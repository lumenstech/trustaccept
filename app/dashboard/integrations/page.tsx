import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function IntegrationsPage() {
  return (
    <>
      <DashboardHeader
        eyebrow="Integrations"
        title="Connected systems"
        description="TrustAccept reads from the tools you already run. We do not replace them."
        actions={<Button>Connect new system</Button>}
      />
      <div className="grid gap-4 px-8 py-8 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}
