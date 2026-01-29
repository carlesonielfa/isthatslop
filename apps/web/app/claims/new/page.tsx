import { redirect } from "next/navigation";
import Link from "next/link";
import { ClaimSubmissionForm } from "@/components/claim-submission-form";
import { getSourceDetailByIdDTO } from "@/data/sources";
import { getCurrentUser } from "@/app/lib/auth.server";

interface ClaimNewPageProps {
  searchParams: Promise<{ source?: string }>;
}

export const metadata = {
  title: "Submit Claim - IsThatSlop",
  description: "Submit a claim for a content source on IsThatSlop.com",
};

export default async function ClaimNewPage({
  searchParams,
}: ClaimNewPageProps) {
  const { source: sourceId } = await searchParams;
  const user = await getCurrentUser();

  // Require authentication
  if (!user) {
    redirect(
      `/login?redirect=/claims/new${sourceId ? `?source=${sourceId}` : ""}`,
    );
  }

  // If a source ID is provided, fetch the source details
  let preselectedSource = null;
  if (sourceId) {
    const sourceDetail = await getSourceDetailByIdDTO(sourceId);
    if (sourceDetail) {
      preselectedSource = {
        id: sourceDetail.id,
        name: sourceDetail.name,
        slug: sourceDetail.slug,
        type: sourceDetail.type,
        tier: sourceDetail.tier,
        claimCount: sourceDetail.claimCount,
      };
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link
          href={
            preselectedSource
              ? `/sources/${preselectedSource.id}/${preselectedSource.slug}`
              : "/"
          }
          className="text-xs text-accent hover:underline"
        >
          &larr;{" "}
          {preselectedSource
            ? `Back to ${preselectedSource.name}`
            : "Back to Home"}
        </Link>
      </div>

      <ClaimSubmissionForm preselectedSource={preselectedSource} />

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>
          By submitting a claim, you agree to our{" "}
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/guidelines" className="text-accent hover:underline">
            Community Guidelines
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
