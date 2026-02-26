# infra

Single-node k3s cluster on Hetzner Cloud, managed with [hetzner-k3s](https://github.com/vitobotta/hetzner-k3s). Kubero is used as the PaaS layer for deploying apps.

## Stack

- **Cluster**: k3s on Hetzner `cpx22` (nbg1), masters-only with `schedule_workloads_on_masters: true`
- **Ingress**: ingress-nginx
- **TLS**: cert-manager with Let's Encrypt (HTTP-01)
- **PaaS**: Kubero operator + UI at `kubero.isthatslop.com`
- **Storage**: Hetzner CSI (`hcloud-volumes` StorageClass)
- **Monitoring**: KuberoPrometheus

## Scripts

### `scripts/bootstrap.sh` — full cluster setup (idempotent)

Run via `bun run infra:bootstrap`. Provisions the cluster and installs all components in order. Safe to re-run — every step checks existing state before acting.

**Prerequisites**: `hetzner-k3s`, `hcloud`, `helm`, `kubectl`, `envsubst`, `openssl`

### `scripts/apply.sh` — apply a manifest with env substitution

```bash
bun run infra:apply infra/k8s/kubero/kubero-cr.yaml
```

Loads `infra/.env`, runs `envsubst`, and pipes to `kubectl apply`. Use this whenever a manifest contains `${VAR}` placeholders.

## Configuration

Copy `infra/.env.example` to `infra/.env` and fill in all values. Never commit `.env`.

Manifests live under `infra/k8s/` and use `${VAR}` syntax for secrets — always apply them via `apply.sh`, not raw `kubectl apply`.

## Known quirks

- The Kubero operator ignores `storageClassName` in its CR and creates the `kubero-data` PVC without one. `bootstrap.sh` detects and fixes this on first install by briefly pausing the operator, deleting the PVC, and recreating it with `storageClassName: hcloud-volumes`.
- The hetzner-k3s firewall only opens SSH/API ports by default. `bootstrap.sh` uses `hcloud firewall add-rule` to open 80/443.
