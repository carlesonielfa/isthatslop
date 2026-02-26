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

: "${HETZNER_TOKEN:?HETZNER_TOKEN is required}"
: "${KUBERO_DOMAIN:?KUBERO_DOMAIN is required}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL is required}"
: "${KUBERO_ADMIN_USER:?KUBERO_ADMIN_USER is required}"
: "${KUBERO_ADMIN_PASS:?KUBERO_ADMIN_PASS is required}"
: "${GITHUB_API_PAT:?GITHUB_API_PAT is required}"
: "${GITHUB_REGISTRY_USER:?GITHUB_REGISTRY_USER is required}"
: "${GITHUB_REGISTRY_PAT:?GITHUB_REGISTRY_PAT is required}"
: "${APP_DOMAIN:?APP_DOMAIN is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

for cmd in hetzner-k3s hcloud helm kubectl envsubst openssl; do
  command -v "$cmd" &>/dev/null || { echo "ERROR: $cmd is not installed"; exit 1; }
done

APP_NAME="isthatslop"
CLUSTER_NAME="${APP_NAME}-master1"
export HCLOUD_TOKEN="$HETZNER_TOKEN"

# --------------------------------------------------------------------------- #

echo "==> 1. Provisioning cluster..."
if kubectl config get-contexts "$CLUSTER_NAME" &>/dev/null; then
  echo "    Context '$CLUSTER_NAME' already exists, skipping."
else
  hetzner-k3s create --config "$INFRA_DIR/cluster/cluster-config.yaml"
fi
kubectl config use-context "$CLUSTER_NAME"

echo "==> 1a. Opening ports 80/443 on cluster firewall..."
# hetzner-k3s creates a firewall named after the cluster; ensure HTTP/HTTPS are open
for port in 80 443; do
  hcloud firewall add-rule "$APP_NAME" \
    --direction in --protocol tcp --port "$port" \
    --source-ips 0.0.0.0/0 --source-ips ::/0 2>/dev/null \
    && echo "    Opened port $port." \
    || echo "    Port $port already open, skipping."
done

echo "==> 2. Installing metrics-server..."
kubectl apply -f "$INFRA_DIR/k8s/kubero/metrics-server.yaml"
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

echo "==> 5. Installing Kubero operator..."
kubectl apply -f https://raw.githubusercontent.com/kubero-dev/kubero-operator/main/deploy/operator.yaml
until kubectl api-resources --api-group=application.kubero.dev 2>/dev/null | grep -q kuberoes; do
  sleep 5
done
kubectl wait --for=condition=available deployment/kubero-operator-controller-manager \
  -n kubero-operator-system --timeout=300s

echo "==> 6. Creating kubero namespace and secrets..."
kubectl create namespace kubero --dry-run=client -o yaml | kubectl apply -f -
if kubectl get secret kubero-secrets -n kubero &>/dev/null; then
  echo "    kubero-secrets already exists, skipping (preserving session/webhook keys)."
else
  kubectl create secret generic kubero-secrets \
    --namespace kubero \
    --from-literal=KUBERO_WEBHOOK_SECRET="$(openssl rand -hex 20)" \
    --from-literal=KUBERO_SESSION_KEY="$(openssl rand -hex 20)" \
    --from-literal=KUBERO_ADMIN_USERNAME="$KUBERO_ADMIN_USER" \
    --from-literal=KUBERO_ADMIN_PASSWORD="$KUBERO_ADMIN_PASS" \
    --from-literal=GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_API_PAT"
fi

echo "==> 7. Applying Kubero CR..."
envsubst < "$INFRA_DIR/k8s/kubero/kubero-cr.yaml" | kubectl apply -f -

# The operator creates kubero-data without a storageClassName on first install; fix it once.
# On re-runs the PVC already has the correct storageClassName so this is a no-op.
PVC_SC=$(kubectl get pvc kubero-data -n kubero -o jsonpath='{.spec.storageClassName}' 2>/dev/null || echo "missing")
if [ "$PVC_SC" != "hcloud-volumes" ]; then
  if [ "$PVC_SC" = "missing" ]; then
    echo "    Waiting for kubero-data PVC to be created by operator..."
    until kubectl get pvc kubero-data -n kubero &>/dev/null; do sleep 3; done
  fi
  echo "    Fixing storageClassName on kubero-data PVC..."
  kubectl scale deployment kubero-operator-controller-manager -n kubero-operator-system --replicas=0
  kubectl wait --for=jsonpath='{.spec.replicas}'=0 \
    deployment/kubero-operator-controller-manager -n kubero-operator-system --timeout=30s
  kubectl delete pvc kubero-data -n kubero
  kubectl create -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: kubero-data
  namespace: kubero
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: hcloud-volumes
  resources:
    requests:
      storage: 1Gi
EOF
  kubectl scale deployment kubero-operator-controller-manager -n kubero-operator-system --replicas=1
fi

echo "    Waiting for Kubero deployment..."
until kubectl get deployment kubero -n kubero &>/dev/null; do sleep 5; done
kubectl wait --for=condition=available deployment/kubero -n kubero --timeout=300s

echo "==> 8. Installing KuberoPrometheus (monitoring)..."
kubectl apply -f "$INFRA_DIR/k8s/kubero/prometheus-cr.yaml"

echo "==> 9. Deploying PostgreSQL..."
envsubst < "$INFRA_DIR/k8s/postgres/postgres.yaml" | kubectl apply -f -

echo "==> 10. Creating app namespace and secrets..."
kubectl create namespace isthatslop-production --dry-run=client -o yaml | kubectl apply -f -

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

echo "==> 11. Deploying app pipeline and app..."
envsubst < "$INFRA_DIR/k8s/app/pipeline.yaml" | kubectl apply -f -
envsubst < "$INFRA_DIR/k8s/app/app.yaml" | kubectl apply -f -

NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')
echo ""
echo "==> Done!"
echo "    Kubero UI: https://${KUBERO_DOMAIN} (user: ${KUBERO_ADMIN_USER})"
echo "    App:       https://${APP_DOMAIN}"
echo "    DNS: point ${KUBERO_DOMAIN} and ${APP_DOMAIN} -> ${NODE_IP}"
echo ""
echo "    Next: add KUBERO_WEBHOOK_SECRET to GitHub repo secrets for CI deploys."
