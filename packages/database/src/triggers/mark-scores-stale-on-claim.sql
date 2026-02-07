-- Trigger to mark source score cache as stale when claims are added, updated, or deleted
-- This ensures scores are always recalculated when the underlying claim data changes

-- Drop existing trigger and function if they exist (idempotent)
DROP TRIGGER IF EXISTS mark_scores_stale_after_claim ON claims;
DROP FUNCTION IF EXISTS mark_score_stale_on_claim_change();

-- Create the trigger function
CREATE OR REPLACE FUNCTION mark_score_stale_on_claim_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark the source's score cache as needing recalculation
  -- Use COALESCE to handle INSERT (NEW exists), UPDATE (NEW exists), and DELETE (only OLD exists)
  -- INSERT...ON CONFLICT handles both "first time" (no cache row yet) and "already exists" cases atomically
  INSERT INTO source_score_cache (source_id, recalculation_requested_at)
  VALUES (COALESCE(NEW.source_id, OLD.source_id), NOW())
  ON CONFLICT (source_id)
  DO UPDATE SET recalculation_requested_at = NOW();

  -- Return the appropriate row for the trigger
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to claims table
-- Fires on INSERT, UPDATE, and DELETE (including soft deletes via UPDATE setting deleted_at)
CREATE TRIGGER mark_scores_stale_after_claim
AFTER INSERT OR UPDATE OR DELETE ON claims
FOR EACH ROW
EXECUTE FUNCTION mark_score_stale_on_claim_change();
