// Message type definitions for claim submission IPC between popup and background service worker.

export interface SubmitClaimMessage {
  type: "SUBMIT_CLAIM";
  sourceId: string;
  content: string;
  impact: number;
  confidence: number;
}

export type SubmitClaimResponse =
  | { ok: true; claimId: string; sourceId: string }
  | { ok: false; error: string; retryAfter?: number };

export interface CreateSourceMessage {
  type: "CREATE_SOURCE";
  name: string;
  url: string;
}

export type CreateSourceResponse =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };
