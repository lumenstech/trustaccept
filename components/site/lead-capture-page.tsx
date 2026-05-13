import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadCaptureForm } from "@/components/forms/lead-capture-form";

interface LeadCapturePageProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: string[];
  submitLabel: string;
  successTitle?: string;
  defaultRiskArea?: string;
  pricingNote?: string;
}

export function LeadCapturePage({
  eyebrow,
  title,
  subtitle,
  bullets,
  submitLabel,
  successTitle,
  defaultRiskArea,
  pricingNote,
}: LeadCapturePageProps) {
  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-6 py-16">
          <Badge tone="info">{eyebrow}</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
        </div>
      </section>

      <section className="border-b border-border/60">
        <div className="container grid gap-10 py-16 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What you'll receive</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {pricingNote ? (
                  <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
                    {pricingNote}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Brand architecture</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                TrustAccept is a Lumens Technology product. Approval delivery and
                identity workflow support powered by SequenceNow.
              </CardContent>
            </Card>
          </div>
          <LeadCaptureForm
            submitLabel={submitLabel}
            successTitle={successTitle}
            defaultRiskArea={defaultRiskArea}
          />
        </div>
      </section>
    </div>
  );
}
