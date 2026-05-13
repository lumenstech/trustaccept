import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustAccept — Accept or reject cyber risk before it becomes an incident",
  description:
    "TrustAccept gives teams a defensible approval record for high-risk AI-agent actions, identity events, vulnerability exceptions, CISA KEV exposure, secure software releases, and device access.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
