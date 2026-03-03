#!/bin/bash
set -euo pipefail

# Loads infra config from infra/.env (see infra/.env.example).
# App secrets are loaded separately by sync-secrets.sh from .env.prod.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$INFRA_DIR/.env" ]; then
  set -a && source "$INFRA_DIR/.env" && set +a
else
  echo "ERROR: infra/.env not found. Copy infra/.env.example and fill it in."
  exit 1
fi

: "${HCLOUD_TOKEN:?HCLOUD_TOKEN is required}"
: "${APP_DOMAIN:?APP_DOMAIN is required}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL is required}"
: "${GITHUB_REGISTRY_USER:?GITHUB_REGISTRY_USER is required}"
: "${GITHUB_REGISTRY_PAT:?GITHUB_REGISTRY_PAT is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

for cmd in hetzner-k3s hcloud helm kubectl envsubst; do
  command -v "$cmd" &>/dev/null || { echo "ERROR: $cmd is not installed"; exit 1; }
done

APP_NAME="isthatslop"
CLUSTER_NAME="${APP_NAME}-master1"

# --------------------------------------------------------------------------- #

echo "==> 1. Provisioning cluster..."
if kubectl config get-contexts "$CLUSTER_NAME" &>/dev/null; then
  echo "    Context '$CLUSTER_NAME' already exists, skipping."
else
  hetzner-k3s create --config "$INFRA_DIR/cluster/cluster-config.yaml"
fi
kubectl config use-context "$CLUSTER_NAME"

echo "==> 1a. Opening ports 80/443 on cluster firewall..."
for port in 80 443; do
  hcloud firewall add-rule "$APP_NAME" \
    --direction in --protocol tcp --port "$port" \
    --source-ips 0.0.0.0/0 --source-ips ::/0 2>/dev/null \
    && echo "    Opened port $port." \
    || echo "    Port $port already open, skipping."
done

echo "==> 2. Installing metrics-server..."
kubectl apply -f "$INFRA_DIR/k8s/metrics-server/metrics-server.yaml"
kubectl wait --for=condition=available deployment/metrics-server -n kube-system --timeout=120s

echo "==> 3. Installing ingress-nginx..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  -f "$INFRA_DIR/k8s/ingress-nginx/values.yaml" \
  --wait

echo "==> 4. Installing cert-manager..."
helm repo add jetstack https://charts.jetstack.io --force-update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true \
  --wait
kubectl wait --for=condition=available deployment/cert-manager-webhook -n cert-manager --timeout=120s
envsubst < "$INFRA_DIR/k8s/cert-manager/cluster-issuer.yaml" | kubectl apply -f -

echo "==> 5. Deploying PostgreSQL..."
envsubst < "$INFRA_DIR/k8s/postgres/postgres.yaml" | kubectl apply -f -
kubectl apply -f "$INFRA_DIR/k8s/postgres/network-policy.yaml"

echo "==> 6. Deploying app..."
envsubst < "$INFRA_DIR/k8s/app/app.yaml" | kubectl apply -f -
kubectl apply -f "$INFRA_DIR/k8s/app/ci-rbac.yaml"

echo "==> 7. Creating app secrets..."
if kubectl get secret ghcr-auth -n isthatslop-production &>/dev/null; then
  echo "    ghcr-auth already exists, skipping."
else
  kubectl create secret docker-registry ghcr-auth \
    --namespace isthatslop-production \
    --docker-server=ghcr.io \
    --docker-username="$GITHUB_REGISTRY_USER" \
    --docker-password="$GITHUB_REGISTRY_PAT"
fi

bash "$SCRIPT_DIR/sync-secrets.sh"

# Patch in DATABASE_URL built from postgres infra credentials
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres.postgres.svc.cluster.local:5432/${POSTGRES_DB}"
kubectl patch secret isthatslop-secrets -n isthatslop-production \
  --type=merge -p "{\"stringData\":{\"DATABASE_URL\":\"$DATABASE_URL\"}}"

echo "==> 8. Generating CI kubeconfig..."
# Wait for the token secret to be populated
until kubectl get secret ci-deployer-token -n isthatslop-production \
  -o jsonpath='{.data.token}' 2>/dev/null | grep -q .; do sleep 2; done

CA=$(kubectl get secret ci-deployer-token -n isthatslop-production \
  -o jsonpath='{.data.ca\.crt}')
TOKEN=$(kubectl get secret ci-deployer-token -n isthatslop-production \
  -o jsonpath='{.data.token}' | base64 -d)
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

cat <<EOF
==> Done!
    App: https://${APP_DOMAIN}
    DNS: point ${APP_DOMAIN} -> $(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')

    Add this as KUBECONFIG secret in GitHub Actions:
---
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${CA}
    server: ${SERVER}
  name: isthatslop
contexts:
- context:
    cluster: isthatslop
    user: ci-deployer
  name: isthatslop
current-context: isthatslop
users:
- name: ci-deployer
  user:
    token: ${TOKEN}
---
EOF
