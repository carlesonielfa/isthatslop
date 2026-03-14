import { redirect } from "next/navigation";

interface SourcesNewPageProps {
  searchParams: Promise<{ url?: string; name?: string }>;
}

export default async function SourcesNewPage({
  searchParams,
}: SourcesNewPageProps) {
  const { url, name } = await searchParams;
  const params = new URLSearchParams();
  if (url) params.set("url", url);
  if (name) params.set("name", name);
  const qs = params.toString();
  redirect(`/claims/new${qs ? `?${qs}` : ""}`);
}
