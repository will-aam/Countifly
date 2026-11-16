import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { DownloadPageClient } from "@/components/download/DownloadPageClient";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  const payload = await getAuthPayload();
  if (!payload?.userId) {
    redirect("/login?from=/downloads");
  }

  return <DownloadPageClient />;
}
