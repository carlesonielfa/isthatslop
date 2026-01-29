"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { TierBadge } from "@/components/tier-badge";
import { ImpactSelector } from "@/components/impact-selector";
import { ConfidenceSelector } from "@/components/confidence-selector";
import { SourceSearch } from "@/components/source-search";
import {
  submitClaim,
  createSource,
  type SearchSourcesResult,
} from "@/data/actions";

type FormMode = "select-source" | "create-source" | "write-claim";

const REDIRECT_DELAY_MS = 1500;
interface ClaimSubmissionFormProps {
  preselectedSource?: {
    id: string;
    name: string;
    slug: string;
    type: string | null;
    tier: number | null;
    claimCount: number;
  } | null;
}

export function ClaimSubmissionForm({
  preselectedSource,
}: ClaimSubmissionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [mode, setMode] = useState<FormMode>(
    preselectedSource ? "write-claim" : "select-source",
  );
  const [selectedSource, setSelectedSource] =
    useState<SearchSourcesResult | null>(
      preselectedSource
        ? {
            id: preselectedSource.id,
            name: preselectedSource.name,
            slug: preselectedSource.slug,
            type: preselectedSource.type,
            tier: preselectedSource.tier,
            claimCount: preselectedSource.claimCount,
            path: "",
          }
        : null,
    );

  // New source creation fields
  const [isCreatingNewSource, setIsCreatingNewSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState("");
  const [newSourceDescription, setNewSourceDescription] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceParent, setNewSourceParent] =
    useState<SearchSourcesResult | null>(null);

  // Claim fields
  const [impact, setImpact] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSourceSelect = (source: SearchSourcesResult | null) => {
    setSelectedSource(source);
    if (source) {
      setMode("write-claim");
    }
  };

  const handleCreateNewSource = (query: string) => {
    setNewSourceName(query);
    setIsCreatingNewSource(true);
    setMode("create-source");
  };

  const handleBackToSearch = () => {
    setMode("select-source");
    setIsCreatingNewSource(false);
    setNewSourceName("");
    setNewSourceType("");
    setNewSourceDescription("");
    setNewSourceUrl("");
    setNewSourceParent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (impact === null) {
      setError("Please select an impact level");
      return;
    }

    if (confidence === null) {
      setError("Please select a confidence level");
      return;
    }

    if (content.length < 100) {
      setError("Claim must be at least 100 characters");
      return;
    }

    if (content.length > 2000) {
      setError("Claim must be at most 2000 characters");
      return;
    }

    startTransition(async () => {
      let sourceId = selectedSource?.id;

      // Create source if we're creating a new one
      if (isCreatingNewSource) {
        if (!newSourceName.trim()) {
          setError("Source name is required");
          return;
        }

        const createResult = await createSource({
          name: newSourceName.trim(),
          type: newSourceType.trim() || undefined,
          description: newSourceDescription.trim() || undefined,
          url: newSourceUrl.trim() || undefined,
          parentId: newSourceParent?.id,
        });

        if (!createResult.success) {
          setError(createResult.error ?? "Failed to create source");
          return;
        }

        sourceId = createResult.sourceId;
      }

      if (!sourceId) {
        setError("Please select or create a source");
        return;
      }

      // Submit the claim
      const result = await submitClaim({
        sourceId,
        impact,
        confidence,
        content,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to submit claim");
        return;
      }

      setSuccess(true);

      // Redirect to the source page after a brief delay
      setTimeout(() => {
        router.push(`/sources/${sourceId}`);
        router.refresh();
      }, REDIRECT_DELAY_MS);
    });
  };

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardTitleBar>Claim Submitted</CardTitleBar>
        <CardContent className="py-8 text-center space-y-4">
          <div className="text-2xl">Your claim has been submitted.</div>
          <p className="text-muted-foreground">
            Redirecting you to the source page...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto overflow-visible">
      <CardTitleBar>Submit a Claim</CardTitleBar>
      <CardContent className="py-6 overflow-visible">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-3">
                {error}
              </div>
            )}

            {/* Source Selection / Creation */}
            {mode === "select-source" && (
              <Field>
                <FieldLabel>Search for a Source</FieldLabel>
                <SourceSearch
                  value={selectedSource}
                  onChange={handleSourceSelect}
                  onCreateNew={handleCreateNewSource}
                  disabled={isPending}
                  placeholder="Type to search sources..."
                />
                <FieldDescription>
                  Search for an existing source or create a new one if it
                  doesn&apos;t exist.
                </FieldDescription>
              </Field>
            )}

            {mode === "create-source" && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Create New Source</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToSearch}
                    disabled={isPending}
                  >
                    Back to Search
                  </Button>
                </div>

                <Field>
                  <FieldLabel htmlFor="source-name">Source Name *</FieldLabel>
                  <Input
                    id="source-name"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="e.g., Reddit, Medium, @username"
                    disabled={isPending}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="source-type">Type</FieldLabel>
                  <Input
                    id="source-type"
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    placeholder="e.g., platform, website, subreddit, blog"
                    disabled={isPending}
                  />
                  <FieldDescription>
                    Categorize what kind of source this is (optional).
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="source-url">URL</FieldLabel>
                  <Input
                    id="source-url"
                    type="url"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={isPending}
                  />
                  <FieldDescription>
                    Link to the source (optional).
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="source-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    id="source-description"
                    value={newSourceDescription}
                    onChange={(e) => setNewSourceDescription(e.target.value)}
                    placeholder="Brief description of this source..."
                    disabled={isPending}
                    className="min-h-20"
                  />
                </Field>

                <Field>
                  <FieldLabel>Parent Source (optional)</FieldLabel>
                  <SourceSearch
                    value={newSourceParent}
                    onChange={setNewSourceParent}
                    disabled={isPending}
                    placeholder="Search for parent source..."
                  />
                  <FieldDescription>
                    If this source belongs to a larger source (e.g., a subreddit
                    belongs to Reddit), search for the parent here.
                  </FieldDescription>
                </Field>

                <Button
                  type="button"
                  onClick={() => setMode("write-claim")}
                  disabled={isPending || !newSourceName.trim()}
                  className="w-full"
                >
                  Continue to Claim
                </Button>
              </>
            )}

            {mode === "write-claim" && (
              <>
                {/* Show selected/new source info */}
                <div className="bg-muted p-3 border border-border-dark">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedSource ? (
                        <>
                          <TierBadge tier={selectedSource.tier} />
                          <div>
                            <div className="font-medium">
                              {selectedSource.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {selectedSource.type && (
                                <span>{selectedSource.type} · </span>
                              )}
                              {selectedSource.claimCount} claims
                            </div>
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="font-medium">{newSourceName}</div>
                          <div className="text-xs text-muted-foreground">
                            New source
                            {newSourceType && ` · ${newSourceType}`}
                            {newSourceParent &&
                              ` · under ${newSourceParent.name}`}
                          </div>
                        </div>
                      )}
                    </div>
                    {!preselectedSource && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedSource) {
                            setSelectedSource(null);
                            setMode("select-source");
                          } else {
                            setMode("create-source");
                          }
                        }}
                        disabled={isPending}
                      >
                        Change
                      </Button>
                    )}
                  </div>
                </div>

                {/* Impact Selection */}
                <Field>
                  <FieldLabel>Impact *</FieldLabel>
                  <ImpactSelector
                    value={impact}
                    onChange={setImpact}
                    disabled={isPending}
                  />
                  <FieldDescription>
                    How much AI usage affects the source&apos;s integrity.
                  </FieldDescription>
                </Field>

                {/* Confidence Selection */}
                <Field>
                  <FieldLabel>Confidence *</FieldLabel>
                  <ConfidenceSelector
                    value={confidence}
                    onChange={setConfidence}
                    disabled={isPending}
                  />
                  <FieldDescription>
                    How certain you are that the content is AI-generated.
                  </FieldDescription>
                </Field>

                {/* Claim Content */}
                <Field>
                  <FieldLabel htmlFor="claim-content">Your Claim *</FieldLabel>
                  <Textarea
                    id="claim-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Describe the AI usage you observed. Include concrete evidence or patterns that led to your conclusion..."
                    disabled={isPending}
                    className="min-h-32"
                    minLength={100}
                    maxLength={2000}
                    required
                  />
                  <FieldDescription>
                    <span
                      className={
                        content.length < 100
                          ? "text-destructive"
                          : content.length > 1800
                            ? "text-orange-500"
                            : ""
                      }
                    >
                      {content.length}
                    </span>
                    /2000 characters (minimum 100)
                  </FieldDescription>
                </Field>

                {/* Evidence Upload (placeholder) */}
                <Field>
                  <FieldLabel htmlFor="evidence-upload">
                    Evidence (optional)
                  </FieldLabel>
                  <div className="space-y-2">
                    <Input
                      id="evidence-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isPending}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setEvidenceFiles((prev) =>
                          [...prev, ...files].slice(0, 3),
                        );
                      }}
                      className="cursor-pointer file:mr-3 file:px-3 file:py-1 file:border-0 file:bg-muted file:text-foreground file:cursor-pointer"
                    />
                    {evidenceFiles.length > 0 && (
                      <div className="space-y-1">
                        {evidenceFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between bg-muted px-2 py-1 text-xs border border-border-dark"
                          >
                            <span className="truncate max-w-50">
                              {file.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setEvidenceFiles((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                              }}
                              disabled={isPending}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FieldDescription>
                    Upload screenshots or images as evidence (max 3 files).
                  </FieldDescription>
                </Field>

                {/* Guidelines */}
                <div className="bg-muted/50 p-3 border border-border-dark/50 text-xs space-y-1">
                  <div className="font-medium">Claim Guidelines:</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    <li>Be specific about the AI evidence you found</li>
                    <li>Use clear, factual language</li>
                    <li>Avoid personal attacks or harassment</li>
                    <li>Focus on the content, not the creators</li>
                  </ul>
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      isPending ||
                      impact === null ||
                      confidence === null ||
                      content.length < 100
                    }
                  >
                    {isPending ? "Submitting..." : "Submit Claim"}
                  </Button>
                </div>
              </>
            )}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
