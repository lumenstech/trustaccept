import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { EvidenceActions } from "@/components/risk/evidence-actions";
import { Badge, RiskLevelBadge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeRecordForEvidence } from "@/lib/evidence";
import { getModule } from "@/lib/modules";
import { requireDashboardAccess } from "@/src/server/auth";
import { getRiskRecordForOrganizationAsync } from "@/src/server/riskRecords";

export const dynamic = "force-dynamic";

export default async function EvidencePacketPage({ params }: { params: { id: string } }) {
  const user = requireDashboardAccess();
  const record = await (async () => {
    try {
      return await getRiskRecordForOrganizationAsync(user, params.id);
    } catch {
      return null;
    }
  })();
  if (!record) notFound();

  const module = getModule(record.module);
  const summary = summarizeRecordForEvidence(record);

  return (
    <>
      <DashboardHeader
        eyebrow="Evidence Packet"
        title={record.title}
        description={`Defensible record for ${module.name}. Mapped to NIST-aligned, CISA KEV-aware references and designed to support audit evidence.`}
        actions={
          <Link
            href={`/approve/${record.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to approval page
          </Link>
        }
      />

      <div className="space-y-6 px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{module.name}</Badge>
              <RiskLevelBadge level={record.riskLevel} />
              <StatusBadge status={record.status} />
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                Decision ID · {record.id}
              </span>
            </div>
            <CardTitle className="mt-3">Decision summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Fact label="Product module" value={summary.module} />
              <Fact label="Risk level" value={summary.riskLevel} />
              <Fact label="Source system" value={summary.sourceSystem} />
              <Fact label="Owner" value={summary.owner} />
              <Fact label="Decision outcome" value={summary.outcome} />
              <Fact label="Expiration" value={summary.expirationDate} />
            </dl>
            <div className="mt-6">
              <EvidenceActions record={record} summary={summary} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Executive summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {summary.executiveSummary}
          </CardContent>
        </Card>

        {summary.accessFields ? (
          <Card>
            <CardHeader>
              <Badge tone="info">Access Accept</Badge>
              <CardTitle className="mt-2">Identity & access context</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Fact label="Request type" value={summary.accessFields.requestType} />
                <Fact label="Requester" value={summary.accessFields.requester} />
                <Fact
                  label="Identity provider"
                  value={summary.accessFields.identityProvider}
                />
                <Fact
                  label="User or service account"
                  value={summary.accessFields.userOrServiceAccount}
                />
                <Fact label="Target system" value={summary.accessFields.targetSystem} />
                <Fact label="Privilege level" value={summary.accessFields.privilegeLevel} />
                <Fact
                  label="Requested duration"
                  value={summary.accessFields.requestedDuration}
                />
                <Fact label="Approval owner" value={summary.accessFields.approvalOwner} />
                <Fact label="Review date" value={summary.reviewDate} />
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {summary.vulnerabilityFields ? (
          <Card>
            <CardHeader>
              <Badge tone="info">Vulnerability Accept</Badge>
              <CardTitle className="mt-2">Finding context</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Fact label="Scanner source" value={summary.vulnerabilityFields.scannerSource} />
                <Fact label="Finding ID" value={summary.vulnerabilityFields.findingId} />
                <Fact label="Severity" value={summary.vulnerabilityFields.severity} />
                <Fact label="Affected asset" value={summary.vulnerabilityFields.affectedAsset} />
                <Fact
                  label="Repository or application"
                  value={summary.vulnerabilityFields.repositoryOrApplication}
                />
                <Fact label="CVE" value={summary.vulnerabilityFields.cve} />
                <Fact label="CWE" value={summary.vulnerabilityFields.cwe} />
                <Fact
                  label="Requested decision"
                  value={summary.vulnerabilityFields.requestedDecision}
                />
                <Fact
                  label="Release-blocking"
                  value={summary.vulnerabilityFields.releaseBlocking ? "Yes" : "No"}
                />
                <Fact label="Review date" value={summary.reviewDate} />
              </dl>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Fact label="Business impact" value={summary.vulnerabilityFields.businessImpact} />
                <Fact
                  label="Technical impact"
                  value={summary.vulnerabilityFields.technicalImpact}
                />
                <Fact
                  label="Remediation plan"
                  value={summary.vulnerabilityFields.remediationPlan}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <PacketCard title="Compensating controls" body={record.compensatingControls} />
          <PacketCard title="Business justification" body={record.businessJustification} />
          <PacketCard title="Technical context" body={record.technicalContext} />
          <PacketCard title="Evidence summary" body={record.evidenceSummary} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Framework tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.frameworkTags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              NIST-aligned · CISA KEV-aware · framework-informed · designed to support
              audit evidence.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source references</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {record.sourceReferences.map((ref, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <FileCheck2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{ref.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {ref.system}
                      {ref.externalId ? ` · ${ref.externalId}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-border pl-6">
              {record.auditTimeline.map((entry, idx) => (
                <li key={idx}>
                  <span className="absolute -left-[6px] mt-1 h-3 w-3 rounded-full bg-primary" />
                  <p className="text-sm font-medium">
                    {entry.actor}{" "}
                    <span className="font-normal text-muted-foreground">
                      {entry.action}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{entry.detail}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {entry.occurredAt}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-foreground">{value}</p>
    </div>
  );
}

function PacketCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
    </Card>
  );
}
