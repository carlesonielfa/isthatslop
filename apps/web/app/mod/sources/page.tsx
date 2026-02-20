import type { Metadata } from "next";
import { Card, CardTitleBar, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { getPendingSourcesDTO } from "@/data/moderation";
import { SourceApprovalButtons } from "./source-approval-buttons";

export const metadata: Metadata = {
  title: "Source Approvals - Moderation - IsThatSlop",
};

interface SourcesPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ModSourcesPage({
  searchParams,
}: SourcesPageProps) {
  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const result = await getPendingSourcesDTO(page);

  return (
    <Card>
      <CardTitleBar>
        Source Approval Queue
        <span className="ml-2 text-xs font-normal">
          ({result.total} pending)
        </span>
      </CardTitleBar>
      <CardContent className="py-3 space-y-3">
        {result.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No pending sources. Queue is clear.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#c0c0c0] border border-border-dark">
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Name
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Type
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    URL
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Submitted By
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Date
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.sources.map((source, idx) => (
                  <tr
                    key={source.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-[#f0f0f0]"}
                  >
                    <td className="px-2 py-1.5 border border-border-dark/20 font-medium">
                      {source.name}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 capitalize text-muted-foreground">
                      {source.type ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 max-w-[160px]">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline truncate block"
                        >
                          {source.url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">
                          No URL
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20">
                      {source.submittedByUsername ?? (
                        <span className="text-muted-foreground italic">
                          unknown
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 text-muted-foreground whitespace-nowrap">
                      {source.createdAt}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20">
                      <SourceApprovalButtons sourceId={source.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={result.page}
          totalPages={result.totalPages}
          basePath="/mod/sources"
        />
      </CardContent>
    </Card>
  );
}
