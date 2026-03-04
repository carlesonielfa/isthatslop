#!/bin/bash
set -euo pipefail

# Syncs all vars from .env.prod in the repo root into the isthatslop-secrets
# Kubernetes secret. Safe to re-run — always does a full replace.
#
# Usage:
#   bash infra/scripts/sync-secrets.sh
#   bun run infra:sync-secrets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env.prod not found in repo root. Copy .env.prod.example and fill it in."
  exit 1
fi

# Variables to exclude from the Kubernetes secret (managed separately, e.g. via operators)
EXCLUDE_VARS=(DATABASE_URL)

# Build --from-literal args from every non-comment, non-empty line in .env.prod
FROM_LITERALS=()
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  key="${line%%=*}"
  for exclude in "${EXCLUDE_VARS[@]}"; do
    [[ "$key" == "$exclude" ]] && continue 2
  done
  FROM_LITERALS+=(--from-literal="$line")
done < "$ENV_FILE"

kubectl create secret generic isthatslop-secrets \
  --namespace isthatslop-production \
  "${FROM_LITERALS[@]}" \
  --save-config \
  --dry-run=client -o yaml | kubectl apply -f -

echo "isthatslop-secrets synced (${#FROM_LITERALS[@]} vars)."
