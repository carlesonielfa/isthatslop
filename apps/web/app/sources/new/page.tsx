import { redirect } from "next/navigation";

interface SourcesNewPageProps {
  searchParams: Promise<{ url?: string }>;
}

export default async function SourcesNewPage({
  searchParams,
}: SourcesNewPageProps) {
  const { url } = await searchParams;
  redirect(`/claims/new${url ? `?url=${encodeURIComponent(url)}` : ""}`);
}
