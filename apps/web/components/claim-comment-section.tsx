"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatTimeAgo } from "@/lib/date";
import type { ClaimCommentDTO } from "@/data/sources";
import { submitClaimComment, voteOnComment } from "@/data/actions";
import { FlagButton } from "@/components/flag-button";

interface ClaimCommentSectionProps {
  claimId: string;
  comments: ClaimCommentDTO[];
}

export function ClaimCommentSection({
  claimId,
  comments,
}: ClaimCommentSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [isDispute, setIsDispute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const disputeCount = comments.filter((comment) => comment.isDispute).length;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (content.trim().length < 10) {
      setError("Comment must be at least 10 characters");
      return;
    }

    if (content.trim().length > 1000) {
      setError("Comment must be at most 1000 characters");
      return;
    }

    startTransition(async () => {
      const result = await submitClaimComment({
        claimId,
        content: content.trim(),
        isDispute,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to submit comment");
        return;
      }

      setContent("");
      setIsDispute(false);
      router.refresh();
    });
  };

  const handleVoteOnComment = (commentId: string, isHelpful: boolean) => {
    setVoteError(null);
    setVotingCommentId(commentId);
    startTransition(async () => {
      const result = await voteOnComment({ commentId, isHelpful });

      setVotingCommentId(null);

      if (!result.success) {
        setVoteError(result.error ?? "Failed to record vote");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{comments.length} comments</span>
        {disputeCount > 0 && (
          <span className="text-destructive">{disputeCount} disputes</span>
        )}
      </div>

      {comments.length === 0 ? (
        <div className="text-xs text-muted-foreground">No comments yet.</div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => {
            const displayName =
              comment.user.displayUsername ||
              comment.user.username ||
              "Anonymous";
            const isVoting = votingCommentId === comment.id && isPending;

            return (
              <div
                key={comment.id}
                className={`border p-2 text-xs ${
                  comment.isDispute
                    ? "border-destructive/60 bg-destructive/5"
                    : "border-border-dark/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserAvatar
                    username={displayName}
                    avatarUrl={comment.user.avatarUrl}
                    size="sm"
                  />
                  <span className="font-medium">{displayName}</span>
                  {comment.isDispute && (
                    <Badge variant="destructive" className="text-[10px]">
                      Dispute
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {formatTimeAgo(comment.createdAt)}
                    {comment.isEdited && " (edited)"}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">
                    +{comment.helpfulVotes} helpful
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={comment.userVote === true ? "default" : "outline"}
                    disabled={isVoting}
                    onClick={() => handleVoteOnComment(comment.id, true)}
                  >
                    {comment.userVote === true ? "Voted Helpful" : "Helpful"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      comment.userVote === false ? "destructive" : "outline"
                    }
                    disabled={isVoting}
                    onClick={() => handleVoteOnComment(comment.id, false)}
                  >
                    {comment.userVote === false
                      ? "Voted Not helpful"
                      : "Not helpful"}
                  </Button>
                  <FlagButton targetType="comment" targetId={comment.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {voteError && (
        <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
          {voteError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
            {error}
          </div>
        )}
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add context, evidence, or a dispute..."
          className="min-h-20"
          maxLength={1000}
          disabled={isPending}
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isDispute}
            onChange={(event) => setIsDispute(event.target.checked)}
            disabled={isPending}
          />
          Mark as dispute
        </label>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Submitting..." : "Post Comment"}
        </Button>
      </form>
    </div>
  );
}
