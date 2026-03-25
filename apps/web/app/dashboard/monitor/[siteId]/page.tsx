// app/monitor/[siteId]/page.tsx
// Server component — receives the dynamic param, renders the client view.

import { Metadata } from "next";
import MonitorDetailClient from "./MonitorDetailClient";

interface Props {
  params: Promise<{ siteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  return {
    title: `Monitor · ${siteId}`,
    description:
      "Uptime, response time, and incident history for this monitor.",
  };
}

export default async function MonitorDetailPage({ params }: Props) {
  const { siteId } = await params;
  return <MonitorDetailClient siteId={siteId} />;
}
