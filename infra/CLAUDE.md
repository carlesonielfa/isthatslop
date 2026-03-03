# infra

Single-node k3s cluster on Hetzner Cloud, managed with [hetzner-k3s](https://github.com/vitobotta/hetzner-k3s). Plain Kubernetes manifests are used for app deployment — no PaaS operator.

## Stack

- **Cluster**: k3s on Hetzner `cpx22` (nbg1), masters-only with `schedule_workloads_on_masters: true`
- **Ingress**: ingress-nginx
- **TLS**: cert-manager with Let's Encrypt (HTTP-01)
- **Storage**: Hetzner CSI (`hcloud-volumes` StorageClass)
- **App namespace**: `isthatslop-production`

## Scripts

### `scripts/bootstrap.sh` — full cluster setup (idempotent)

Run via `bun run infra:bootstrap`. Provisions the cluster and installs all components in order. Safe to re-run — every step checks existing state before acting.

At the end it prints a scoped kubeconfig for the `ci-deployer` service account — save this as the `KUBECONFIG` secret in GitHub Actions.

**Prerequisites**: `hetzner-k3s`, `hcloud`, `helm`, `kubectl`, `envsubst`

### `scripts/sync-secrets.sh` — sync app secrets

```bash
bun run infra:sync-secrets
```

Syncs all vars from `.env.prod` in the repo root into the `isthatslop-secrets` Kubernetes secret in `isthatslop-production`. Safe to re-run.

### `scripts/apply.sh` — apply a manifest with env substitution

```bash
bun run infra:apply infra/k8s/app/app.yaml
```

Loads `infra/.env`, runs `envsubst`, and pipes to `kubectl apply`.

## Configuration

Copy `infra/.env.example` to `infra/.env` and fill in all values. Never commit `.env`.

Manifests live under `infra/k8s/` and use `${VAR}` syntax for secrets — always apply them via `apply.sh`, not raw `kubectl apply`.

## CD

GitHub Actions ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)) builds and pushes the image on every push to `main`, then runs `kubectl rollout restart` using a scoped kubeconfig stored as the `KUBECONFIG` secret.

The `ci-deployer` service account has a single `Role` allowing only `get` and `patch` on `deployments` in `isthatslop-production` — nothing else.

## Known quirks

- The hetzner-k3s firewall only opens SSH/API ports by default. `bootstrap.sh` uses `hcloud firewall add-rule` to open 80/443.
