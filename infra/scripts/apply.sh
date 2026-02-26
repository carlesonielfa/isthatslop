#!/bin/bash
set -euo pipefail
# Apply a YAML manifest with environment variable substitution from infra/.env
# Usage: bash infra/scripts/apply.sh <manifest-path>
# Example: bun run infra:apply infra/k8s/kubero/kubero-cr.yaml

if [ -z "${1-}" ]; then
  echo "Usage: $0 <manifest-path>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Create it from infra/.env.example"
  exit 1
fi

set -a && source "$ENV_FILE" && set +a
envsubst < "$1" | kubectl apply -f -
