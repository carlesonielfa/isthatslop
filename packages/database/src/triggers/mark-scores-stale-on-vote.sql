-- Trigger to mark source score cache as stale when claim votes are added, updated, or deleted
-- Vote changes affect the score calculation (via helpful_votes in the weight formula)

-- Drop existing trigger and function if they exist (idempotent)
DROP TRIGGER IF EXISTS mark_scores_stale_after_vote ON claim_votes;
DROP FUNCTION IF EXISTS mark_score_stale_on_vote_change();

-- Create the trigger function
CREATE OR REPLACE FUNCTION mark_score_stale_on_vote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_source_id uuid;
BEGIN
  -- Get the source_id from the claim that was voted on
  -- Use COALESCE to handle INSERT/UPDATE (NEW exists) and DELETE (only OLD exists)
  SELECT source_id INTO affected_source_id
  FROM claims
  WHERE id = COALESCE(NEW.claim_id, OLD.claim_id);

  -- Only mark score as stale if the claim exists
  -- (claim might have been deleted in a cascading operation)
  IF affected_source_id IS NOT NULL THEN
    -- Mark the source's score cache as needing recalculation
    -- INSERT...ON CONFLICT handles both "first time" and "already exists" atomically
    INSERT INTO source_score_cache (source_id, recalculation_requested_at)
    VALUES (affected_source_id, NOW())
    ON CONFLICT (source_id)
    DO UPDATE SET recalculation_requested_at = NOW();
  END IF;

  -- Return the appropriate row for the trigger
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to claim_votes table
-- Fires on INSERT, UPDATE, and DELETE
CREATE TRIGGER mark_scores_stale_after_vote
AFTER INSERT OR UPDATE OR DELETE ON claim_votes
FOR EACH ROW
EXECUTE FUNCTION mark_score_stale_on_vote_change();
