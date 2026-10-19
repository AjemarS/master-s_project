# Deployment: dev → staging → prod

One repository, three environments:

| Environment | Gets | Runs |
|---|---|---|
| dev | any branch | locally, `docker compose up` |
| staging | every merge to `main`, automatically | host, `techhub-staging` stack, gateway on 127.0.0.1:8081 |
| prod | a `v*` tag, after a reviewer approves | same host, `techhub-prod` stack, gateway on 127.0.0.1:8080 |

CI (`.github/workflows/ci.yaml`) runs lint, tests and a build of the production images on every PR.
On `main` or a tag it publishes amd64 images to GHCR, tagged with the commit (`publish-images`), then
`deploy.yaml` builds that environment's frontend, checks out the commit on the host, runs
`deploy/deploy.sh` and waits for `/health`. Staging and prod run the same backend images.

An idle stack uses about 1 GB of RAM, so both fit on one Contabo VPS (x86, 4 vCPU / 8 GB). For an ARM host
(Oracle A1, Hetzner CAX), set `runs-on: ubuntu-24.04-arm` in `publish-images` and `deploy.yaml`.

## One-time host setup

On an Ubuntu VPS:

```bash
# Docker and Caddy
curl -fsSL https://get.docker.com | sudo sh
sudo apt install -y caddy git
sudo usermod -aG docker "$USER"   # log out and back in

# one checkout per environment
sudo install -d -o "$USER" /opt/techhub-staging /opt/techhub-prod
git clone https://github.com/AjemarS/master-s_project.git /opt/techhub-staging
git clone https://github.com/AjemarS/master-s_project.git /opt/techhub-prod
```

In each checkout create `.env` from `.env.example`, with its own secrets, and also set:

| Variable | staging | prod |
|---|---|---|
| `GATEWAY_BIND` | `127.0.0.1:8081` | `127.0.0.1:8080` |
| `CORS_ORIGINS`, `FRONTEND_URL` | `https://staging.<domain>` | `https://<domain>` |
| `BETTER_AUTH_URL` | `https://staging.<domain>/auth` | `https://<domain>/auth` |
| `NODE_ENV` | `production` | `production` |
| `DEBUG` | `False` | `False` |

TLS: copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile` and put your two domains in it, point both DNS names at the VM, open ports 80, 443 and SSH in the
provider's firewall and in `ufw` if it is enabled, then `sudo systemctl restart caddy`.

## One-time GitHub setup

1. **Deploy key.** On the VM: `ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""` and append the `.pub` to
   `~/.ssh/authorized_keys`. From your machine, `ssh-keyscan <vm-ip>` gives the known_hosts line.
2. **Environments** (Settings → Environments): create `staging` and `prod`. In each set the variable
   `PUBLIC_URL` and the secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (the private key) and
   `DEPLOY_KNOWN_HOSTS`. On `prod` add yourself under *Required reviewers* and limit deployment to `v*` tags.
3. **Images.** After the first `publish-images` run, open each package under the repo's *Packages* and set
   its visibility to public, so the host pulls without credentials.
4. **Branch protection** for `main`: require a PR and passing CI checks.

## Releasing

- Staging: merge a PR into `main`.
- Prod: `git tag v1.0.0 && git push origin v1.0.0`, then approve the deployment in the Actions run.
- Roll back: re-run the deploy job of an earlier tag, or on the host
  `cd /opt/techhub-prod && git checkout --detach <sha> && sh deploy/deploy.sh prod <sha>`.
