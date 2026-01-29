import { redirect } from "next/navigation";

interface ReviewNewPageProps {
  searchParams: Promise<{ source?: string }>;
}

export const metadata = {
  title: "Submit Claim - IsThatSlop",
  description: "Submit a claim for a content source on IsThatSlop.com",
};

export default async function ReviewNewPage({
  searchParams,
}: ReviewNewPageProps) {
  const { source: sourceId } = await searchParams;
  redirect(`/claims/new${sourceId ? `?source=${sourceId}` : ""}`);
}
