# TechHub Production Deployment Guide — Oracle Cloud Infrastructure

> **Target:** Deploy the TechHub e-commerce platform (microservices, ~16 containers) on Oracle Cloud Infrastructure.
> **Audience:** Developer-operators who built the dev setup and need to take it live.
> **Prerequisites:** OCI account with CLI installed and configured, Docker, access to the project repository.

---

## Table of Contents

1. [Pre-Flight: Critical Security Fixes](#1-pre-flight-critical-security-fixes-before-anything-else)
2. [Secrets Management (OCI Vault)](#2-secrets-management-oci-vault)
3. [SSL/TLS with Let's Encrypt + OCI Load Balancer](#3-ssltls-with-lets-encrypt--oci-load-balancer)
4. [Docker Compose → Production Profile](#4-docker-compose--production-profile)
5. [Database Strategy for Oracle Cloud](#5-database-strategy-for-oracle-cloud)
6. [OCI Networking Setup](#6-oci-networking-setup)
7. [Media Files — OCI Object Storage](#7-media-files--oci-object-storage)
8. [CI/CD Pipeline (GitHub Actions → OCI Container Registry)](#8-cicd-pipeline-github-actions--oci-container-registry)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Application-Level Production Fixes](#10-application-level-production-fixes)
11. [Performance & Scaling Guide](#11-performance--scaling-guide)
12. [Backup & Disaster Recovery](#12-backup--disaster-recovery)
13. [Production Checklist](#13-production-checklist)

---

## 1. Pre-Flight: Critical Security Fixes Before Anything Else

### 1.1 The Problem

Your `.env` file contains **live credentials** that must be treated as compromised:

| Secret | Location | Risk |
|--------|----------|------|
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | `.env` line 12-13 | Anyone with access can OAuth-spam your app |
| `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` | `.env` line 15-16 | Same — credential-stuffing OAuth |
| `STRIPE_SECRET_KEY` (test mode) | `.env` line 46 | Test-mode key is low-risk but still exposed |
| `STRIPE_WEBHOOK_SECRET` (test mode) | `.env` line 47 | Could allow forged webhook events |
| `RESEND_API_KEY` | `.env` line 48 | **Live key** — can send email as your domain |

**CRITICAL:** These are plaintext in the repo's `.env` file. They have been used in development. Do not skip this step.

### 1.2 Rotate Immediately

**Google OAuth:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Select the OAuth 2.0 Client ID for your project
3. Click **"Regenerate secret"** (pencil icon → regenerate)
4. Copy the new secret — the old one is immediately invalid

**GitHub OAuth:**
1. Go to https://github.com/settings/developers
2. Select your OAuth App → **"Generate a new client secret"**
3. The old secret is immediately invalid

**Stripe:**
1. Go to https://dashboard.stripe.com/apikeys
2. For the test secret key: click **"Roll"** → confirm
3. For the webhook secret: go to **Developers → Webhooks** → your endpoint → **"Regenerate"**

**Resend:**
1. Go to https://resend.com/api-keys
2. Delete the key (`re_WAFDaCjK_...`) and create a new one
3. Set it to restricted (only the email sending permission)

### 1.3 Sanitize Git History

After rotation, remove the compromised values from git:

```bash
# Create a clean .env.example (already exists, but verify no secrets)
cp .env .env.example
# Edit .env.example to replace all values with dummy placeholders

# Remove .env from git tracking (it should never have been committed)
echo ".env" >> .gitignore

# If .env was already committed, scrub it from history
# WARNING: This rewrites git history. Coordinate with all developers.
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

**After rotation, delete the old `.env` file and create a fresh one with only the rotated values. Never commit it again.**

---

## 2. Secrets Management (OCI Vault)

### 2.1 Why OCI Vault

The `.env` file is a single point of failure. If the production server is compromised, all secrets leak. OCI Vault provides:

- **Encryption at rest** with a master key that never leaves the HSM
- **Audit logging** of every secret access
- **Rotation** without code changes
- **Separation** — DB passwords, API keys, app secrets each get their own secret

### 2.2 Create a Vault

```bash
# Set your compartment OCID
COMPARTMENT_OCID="ocid1.compartment.oc1..yourcompartment"

# Create the vault (wait ~5 minutes for provisioning)
oci kms vault create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-Vault" \
  --vault-type "DEFAULT" \
  --wait-for-state "ACTIVE"

# Get the vault OCID from output
VAULT_OCID="ocid1.vault.oc1..yourvaultid"
```

### 2.3 Create a Master Encryption Key

```bash
# Create key (AES-256)
oci kms key create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-Master-Key" \
  --key-shape '{"algorithm":"AES","length":32}' \
  --protection-mode "HSM" \
  --wait-for-state "ENABLED"

# Get the key OCID
KEY_OCID="ocid1.key.oc1..yourkeyid"
```

### 2.4 Store Secrets

For each secret, you'll create a vault secret. Use descriptive names:

```bash
# Helper function
store_secret() {
  local name=$1
  local value=$2
  oci vault secret create-base64 \
    --compartment-id "$COMPARTMENT_OCID" \
    --vault-id "$VAULT_OCID" \
    --key-id "$KEY_OCID" \
    --secret-name "techhub_$name" \
    --secret-content-content "$(echo -n "$value" | base64 -w0)" \
    --secret-content-name "content" \
    --secret-content-stage "CURRENT"
}

# Store all secrets
store_secret "db_password_products" "$(openssl rand -base64 32)"
store_secret "db_password_inventory" "$(openssl rand -base64 32)"
store_secret "db_password_orders" "$(openssl rand -base64 32)"
store_secret "db_password_auth" "$(openssl rand -base64 32)"
store_secret "db_password_notifications" "$(openssl rand -base64 32)"
store_secret "db_password_audit" "$(openssl rand -base64 32)"
store_secret "django_secret_key_product" "$(openssl rand -base64 64)"
store_secret "django_secret_key_inventory" "$(openssl rand -base64 64)"
store_secret "django_secret_key_orders" "$(openssl rand -base64 64)"
store_secret "better_auth_secret" "$(openssl rand -hex 32)"
store_secret "google_client_id" "<rotated-google-client-id>"
store_secret "google_client_secret" "<rotated-google-client-secret>"
store_secret "github_client_id" "<rotated-github-client-id>"
store_secret "github_client_secret" "<rotated-github-client-secret>"
store_secret "stripe_secret_key" "<rotated-stripe-secret-key>"
store_secret "stripe_webhook_secret" "<rotated-stripe-webhook-secret>"
store_secret "resend_api_key" "<rotated-resend-api-key>"
store_secret "rabbitmq_password" "$(openssl rand -base64 24)"
```

### 2.5 Retrieve Secrets at Runtime

**Option A: OCI Resource Principal (Recommended for OCI Compute)**

Assign a dynamic group to your compute instance and attach a policy:

```bash
# Create dynamic group
oci iam dynamic-group create \
  --name "TechHubCompute" \
  --matching-rule 'All {instance.compartment.id = "ocid1.compartment.oc1..yourcompartment"}'

# Create policy
oci iam policy create \
  --name "TechHubVaultAccess" \
  --statements '["Allow dynamic-group TechHubCompute to read secret-bundles in compartment TechHub"]' \
  --compartment-id "$COMPARTMENT_OCID"
```

On the compute instance, use OCI CLI (installed by default on Oracle Linux images):

```bash
# Get a secret at runtime
oci vault secret-bundle get \
  --secret-id "ocid1.vaultsecret.oc1..yoursecretid" \
  --query 'data."secret-bundle-content".content' \
  --raw-output | base64 -d
```

**Option B: CLI-Based Retrieval in Entrypoint Script**

Create a `docker-entrypoint.sh` that fetches secrets before starting services:

```bash
#!/bin/bash
set -e

export DATABASE_URL="postgresql://techhub:$(oci vault secret-bundle get \
  --secret-id "$PRODUCTS_DB_PASSWORD_SECRET_ID" \
  --query 'data."secret-bundle-content".content' --raw-output | base64 -d)@products_db:5432/products_db"

exec "$@"
```

**Option C: Environment File from Vault (Simpler)**

On the production instance, run a one-time fetch that writes a `.env.production`:

```bash
#!/bin/bash
# /opt/techhub/fetch-secrets.sh
SECRETS_DIR=/opt/techhub/secrets
mkdir -p "$SECRETS_DIR"

declare -A SECRET_MAP=(
  ["DJANGO_SECRET_KEY"]="ocid1.vaultsecret.oc1..product-django-secret"
  ["POSTGRES_PASSWORD"]="ocid1.vaultsecret.oc1..db-password-products"
  # ... map all secrets
)

for var in "${!SECRET_MAP[@]}"; do
  VALUE=$(oci vault secret-bundle get \
    --secret-id "${SECRET_MAP[$var]}" \
    --query 'data."secret-bundle-content".content' \
    --raw-output | base64 -d)
  echo "$var=$VALUE" >> "$SECRETS_DIR/.env.production"
done
```

Then `docker compose --env-file /opt/techhub/secrets/.env.production up -d`.

---

## 3. SSL/TLS with Let's Encrypt + OCI Load Balancer

### 3.1 Recommended: OCI Load Balancer with SSL Termination

OCI Load Balancer is free within the Always Free Tier (10 Mbps). SSL termination at the LB means:

- **Your Nginx containers never handle TLS** — simpler config, less CPU
- **Automatic health checks** — LB stops routing to unhealthy containers
- **OCI-managed certificate** — auto-renewal if using OCI Certificates service

#### Architecture

```
Internet → OCI Load Balancer (443/HTTPS) → Compute Instance (80/HTTP) → Nginx Container (8080)
```

### 3.2 Create the Load Balancer

```bash
# Create load balancer (10 Mbps — always free tier eligible)
oci lb load-balancer create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-LB" \
  --shape-name "10Mbps" \
  --is-private false \
  --subnet-ids '["ocid1.subnet.oc1..public-subnet-id"]'

LB_OCID="ocid1.loadbalancer.oc1..yourlb"
```

### 3.3 Get an SSL Certificate

**Option A: Let's Encrypt + OCI Certificates**

On a machine with the domain pointing to the LB's public IP:

```bash
# Install certbot
apt install certbot -y

# Get certificate (DNS challenge for headless, HTTP challenge if LB allows HTTP)
certbot certonly --manual --preferred-challenges dns \
  -d techhub.example.com -d www.techhub.example.com

# Files are at:
#   /etc/letsencrypt/live/techhub.example.com/fullchain.pem
#   /etc/letsencrypt/live/techhub.example.com/privkey.pem

# Upload to OCI Certificates
oci certificates certificate-authority create \
  --compartment-id "$COMPARTMENT_OCID" \
  --name "TechHub-CA"

# Create certificate
oci certificates certificate create \
  --compartment-id "$COMPARTMENT_OCID" \
  --name "TechHub-Cert" \
  --certificate-data "$(base64 -w0 < /etc/letsencrypt/live/techhub.example.com/fullchain.pem)" \
  --private-key-data "$(base64 -w0 < /etc/letsencrypt/live/techhub.example.com/privkey.pem)"
```

**Option B: Import Existing Certificate to LB Directly**

```bash
oci lb certificate create \
  --load-balancer-id "$LB_OCID" \
  --certificate-name "techhub-cert" \
  --public-certificate-file /path/to/fullchain.pem \
  --private-key-file /path/to/privkey.pem
```

### 3.4 Configure Listener and Backend Set

```bash
# Create backend set pointing to instance port 80
oci lb backend-set create \
  --load-balancer-id "$LB_OCID" \
  --name "techhub-backend" \
  --policy "ROUND_ROBIN" \
  --health-checker-protocol "HTTP" \
  --health-checker-url-path "/health" \
  --health-checker-port "80" \
  --health-checker-return-code "200" \
  --health-checker-interval-ms "10000" \
  --health-checker-timeout-in-millis "5000" \
  --health-checker-retries "3"

# Add backend (your compute instance private IP)
oci lb backend create \
  --load-balancer-id "$LB_OCID" \
  --backend-set-name "techhub-backend" \
  --ip-address "10.0.1.10" \
  --port "80"

# Create HTTPS listener
oci lb listener create \
  --load-balancer-id "$LB_OCID" \
  --default-backend-set-name "techhub-backend" \
  --port "443" \
  --protocol "HTTP" \
  --ssl-certificate-name "techhub-cert" \
  --rule-set-names '["force-https"]'
```

### 3.5 Update Nginx Configuration

**Remove SSL from nginx.conf** (LB handles it), but add redirect and security headers:

```nginx
server {
    listen 8080;
    server_name techhub.example.com;

    # The LB sets X-Forwarded-Proto: https
    # Detect forwarded protocol for redirects
    if ($http_x_forwarded_proto != 'https') {
        return 301 https://$host$request_uri;
    }

    # ── Security headers ──
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rest of existing config...
}
```

### 3.6 Update Cookie Security and CORS

In `docker-compose.yaml`, update environment variables for production:

```yaml
auth-service:
  environment:
    BETTER_AUTH_URL: https://techhub.example.com/auth
    FRONTEND_URL: https://techhub.example.com
    # Cookies must be secure, same-site
    # Set in auth-service code:
    #   sameSite: "lax"
    #   secure: true
```

Update `.env`:

```bash
CORS_ORIGINS=https://techhub.example.com,https://www.techhub.example.com
FRONTEND_URL=https://techhub.example.com
BETTER_AUTH_URL=https://techhub.example.com/auth
NEXT_PUBLIC_API_URL=https://techhub.example.com/api
NEXT_PUBLIC_AUTH_URL=https://techhub.example.com/auth
```

**CRITICAL:** In `auth-service/src/index.ts`, ensure cookie config sets `secure: true` in production:

```typescript
// Detect production from NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';

// In Better Auth config:
cookies: {
  secure: isProduction,
  sameSite: "lax" as const,
}
```

### 3.7 Alternative: Let's Encrypt on Nginx Directly

If you skip the OCI LB (single instance, no scaling):

```nginx
# In nginx/nginx.conf — production HTTPS server
server {
    listen 443 ssl http2;
    server_name techhub.example.com;

    ssl_certificate /etc/letsencrypt/live/techhub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/techhub.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # ... rest of config
}

server {
    listen 8080;
    server_name techhub.example.com;
    return 301 https://$server_name$request_uri;
}
```

Add certbot renewal as a cron job:

```bash
# /etc/cron.d/certbot-renew
0 3 * * * root certbot renew --quiet --post-hook "docker compose exec gateway nginx -s reload"
```

---

## 4. Docker Compose → Production Profile

### 4.1 Create a Production Override File

Instead of modifying `docker-compose.yaml` (used for dev), create `docker-compose.prod.yaml` that overrides dev settings:

```yaml
version: "3.8"

services:
  # ── Django Services: Remove dev volumes, use production commands ──

  product-service:
    volumes: []           # Remove bind mounts
    ports: []             # Remove host port exposure
    environment:
      DEBUG: "False"
      DJANGO_LOG_LEVEL: "INFO"
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn product_service.wsgi:application
               -w $((2 * $(nproc) + 1))
               --bind 0.0.0.0:8000
               --log-level info
               --access-logfile -
               --error-logfile -"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: "512M"
        reservations:
          cpus: "0.5"
          memory: "256M"

  inventory-service:
    volumes: []
    ports: []
    environment:
      DEBUG: "False"
      DJANGO_LOG_LEVEL: "INFO"
    command: >
      sh -c "python manage.py migrate &&
             gunicorn inventory_service.wsgi:application
               -w $((2 * $(nproc) + 1))
               --bind 0.0.0.0:8001
               --log-level info
               --access-logfile -
               --error-logfile -"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: "384M"
        reservations:
          cpus: "0.25"
          memory: "192M"

  order-service:
    volumes: []
    ports: []
    environment:
      DEBUG: "False"
      DJANGO_LOG_LEVEL: "INFO"
    command: >
      sh -c "python manage.py migrate &&
             gunicorn order_service.wsgi:application
               -w $((2 * $(nproc) + 1))
               --bind 0.0.0.0:8002
               --log-level info
               --access-logfile -
               --error-logfile -"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/api/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: "384M"
        reservations:
          cpus: "0.25"
          memory: "192M"

  # ── Auth Service ──

  auth-service:
    volumes: []
    ports: []
    environment:
      NODE_ENV: "production"
      LOG_LEVEL: "info"
    command: sh -c "npm run migrate && node dist/index.js"
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', r => {process.exit(r.statusCode===200?0:1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: "256M"
        reservations:
          cpus: "0.25"
          memory: "128M"

  # ── Notification Service ──

  notification-service:
    environment:
      NODE_ENV: "production"
      LOG_LEVEL: "info"
    command: node dist/index.js
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8003/health', r => {process.exit(r.statusCode===200?0:1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: "192M"
        reservations:
          cpus: "0.125"
          memory: "96M"

  # ── Audit Service ──

  audit-service:
    environment:
      NODE_ENV: "production"
      LOG_LEVEL: "info"
    command: node dist/index.js
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8005/health', r => {process.exit(r.statusCode===200?0:1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: "192M"
        reservations:
          cpus: "0.125"
          memory: "96M"

  # ── Frontend ──

  frontend:
    volumes: []
    ports: []
    environment:
      NODE_ENV: "production"
      NEXT_PUBLIC_API_URL: "https://techhub.example.com/api"
      NEXT_PUBLIC_AUTH_URL: "https://techhub.example.com/auth"
      NEXT_PUBLIC_BASE_URL: "https://techhub.example.com"
      API_SERVICE_URL: "http://gateway:8080/api"
      PROXY_AUTH_URL: "http://gateway:8080/auth"
    command: npm run start
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000', r => {process.exit(r.statusCode<500?0:1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: "1G"
        reservations:
          cpus: "0.5"
          memory: "512M"

  # ── Consumers ──

  product-consumer:
    volumes: []
    environment:
      DEBUG: "False"
      DJANGO_LOG_LEVEL: "INFO"
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: "192M"

  inventory-consumer:
    volumes: []
    environment:
      DEBUG: "False"
      DJANGO_LOG_LEVEL: "INFO"
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: "192M"

  # ── Gateway ──

  gateway:
    ports:
      - "80:8080"       # Only port 80 (LB handles SSL)
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: "128M"
        reservations:
          cpus: "0.25"
          memory: "64M"

  # ── Databases: Remove host port mappings ──

  products_db:
    ports: []             # CRITICAL: never expose DB to host
    restart: always
    deploy:
      resources:
        limits:
          memory: "512M"

  inventory_db:
    ports: []
    restart: always
    deploy:
      resources:
        limits:
          memory: "512M"

  orders_db:
    ports: []
    restart: always
    deploy:
      resources:
        limits:
          memory: "512M"

  auth_db:
    ports: []
    restart: always
    deploy:
      resources:
        limits:
          memory: "512M"

  notifications_db:
    ports: []
    restart: always
    deploy:
      resources:
        limits:
          memory: "256M"

  audit_db:
    ports: []
    restart: always
    deploy:
      resources:
        limits:
          memory: "256M"

  rabbitmq:
    ports:    # Only expose management port to internal network
      - "15672:15672"
    restart: always
    deploy:
      resources:
        limits:
          memory: "256M"

  redis:
    ports: []             # Not exposed externally
    restart: always
    deploy:
      resources:
        limits:
          memory: "128M"
```

### 4.2 Why Each Change Is Made

| Change | Reason |
|--------|--------|
| Remove bind mounts | Production images are self-contained. Bind mounts make deployments dependent on host file state. |
| Remove host port mappings for DBs | Databases must never be accessible from outside the Docker network. Direct DB access is a top-10 OWASP misconfiguration. |
| `DEBUG=False` | Disables Django debug pages that leak secrets, settings, and stack traces. |
| `--reload` removed | Auto-reload watches file changes for development. In production it wastes CPU and opens a security surface. |
| Workers = `$((2 * nproc) + 1)` | Standard gunicorn formula. Each worker is a separate Python process handling requests. |
| `collectstatic` added | Collects static files into a known location for Nginx to serve. |
| Healthchecks | Without them, Docker doesn't know when the app is actually ready or has crashed. |
| Resource limits | Prevents one service from starving others. A memory leak in the frontend shouldn't OOM-kill PostgreSQL. |
| `restart: always` | Ensures services restart after crash or host reboot. `unless-stopped` is almost the same, but `always` is explicit. |

### 4.3 Run in Production

```bash
# Deploy with both files
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d

# To check what's different
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml config
```

---

## 5. Database Strategy for Oracle Cloud

### 5.1 Option A: OCI Managed PostgreSQL (Recommended if Budget Allows)

OCI offers MySQL and PostgreSQL managed database services. Benefits:

- Automated patching, backups (up to 365 days retention)
- Automatic storage expansion
- High availability with automatic failover (choose Standby or Data Guard)
- No need to manage DB containers

**Setup:**

```bash
# Create a single PostgreSQL system
oci psql db-system create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-DB" \
  --db-version "15" \
  --shape "PostgreSQL.VM.Standard.E4.Flex.1.OG" \
  --subnet-id "ocid1.subnet.oc1..private-subnet-id" \
  --storage-in-gbs "256" \
  --admin-username "techhub_admin" \
  --admin-password "$(openssl rand -base64 24)"
```

**Connection string format:**

```
postgresql://techhub_admin:PASSWORD@10.x.x.x:5432/techhub_db
```

**Multi-tenancy:** With one database, create separate databases/schemas:

```sql
CREATE DATABASE products_db OWNER techhub_admin;
CREATE DATABASE inventory_db OWNER techhub_admin;
CREATE DATABASE orders_db OWNER techhub_admin;
CREATE DATABASE auth_db OWNER techhub_admin;
CREATE DATABASE notifications_db OWNER techhub_admin;
CREATE DATABASE audit_db OWNER techhub_admin;
```

Each service connects to its own database on the same server.

### 5.2 Option B: Self-Hosted PostgreSQL Containers (Cheaper)

Use persistent volumes backed by OCI Block Storage.

**Create a block volume for data:**

```bash
oci bv volume create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "techhub-db-data" \
  --size-in-gbs "100" \
  --availability-domain "AD-1"

VOLUME_OCID="ocid1.volume.oc1..yourvolumeid"

# Attach to compute instance
oci bv attachment attach \
  --instance-id "ocid1.instance.oc1..yourinstance" \
  --volume-id "$VOLUME_OCID" \
  --device "/dev/oracleoci/oraclevdb"
```

**Mount and use for Docker volumes:**

```bash
# Format (first time only)
sudo mkfs.ext4 /dev/oracleoci/oraclevdb

# Mount
sudo mkdir -p /data/techhub/postgres
sudo mount /dev/oracleoci/oraclevdb /data/techhub/postgres

# Make mount persistent
echo "/dev/oracleoci/oraclevdb /data/techhub/postgres ext4 defaults,_netdev 0 2" | sudo tee -a /etc/fstab

# Use as Docker volume mount
docker volume create \
  --driver local \
  --opt type=none \
  --opt device=/data/techhub/postgres/products \
  --opt o=bind \
  postgres_products_data
```

### 5.3 Database Consolidation (Strongly Recommended)

Running 6 separate PostgreSQL instances is expensive and wasteful. Consolidate to 2 or 3:

**Recommended layout:**

| Database Server | Databases | Services |
|----------------|-----------|----------|
| `techhub-db-1` (2 vCPU, 4GB RAM) | `products_db`, `inventory_db`, `orders_db`, `audit_db` | Product, Inventory, Order, Audit (Django) |
| `techhub-db-2` (1 vCPU, 2GB RAM) | `auth_db`, `notifications_db` | Auth, Notifications |

This halves your DB resource footprint. All Django services already use different `DATABASE_URL` values — just point them to the consolidated host.

### 5.4 Backup Strategy

Regardless of Option A or B, set up automated backups:

```bash
#!/bin/bash
# /opt/techhub/scripts/backup-dbs.sh

BACKUP_DIR="/data/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
OCI_BUCKET="techhub-db-backups"
OCI_NAMESPACE="your-tenancy-namespace"

mkdir -p "$BACKUP_DIR"

# Backup all databases from Docker containers
for SERVICE in products_db inventory_db orders_db auth_db notifications_db audit_db; do
  echo "Backing up $SERVICE..."

  # Extract DB credentials from Docker inspect (or use a config file)
  DB_NAME=$(docker inspect "$SERVICE" | jq -r '.[0].Config.Env[] | select(startswith("POSTGRES_DB=")) | .[12:]')
  DB_USER=$(docker inspect "$SERVICE" | jq -r '.[0].Config.Env[] | select(startswith("POSTGRES_USER=")) | .[14:]')

  # Dump from the container directly
  docker exec "$SERVICE" pg_dump -U "$DB_USER" "$DB_NAME" \
    --no-owner --no-acl \
    | gzip > "$BACKUP_DIR/${SERVICE}_${TIMESTAMP}.sql.gz"

  echo "  -> ${SERVICE}_${TIMESTAMP}.sql.gz ($(du -h "$BACKUP_DIR/${SERVICE}_${TIMESTAMP}.sql.gz" | cut -f1))"
done

# Upload to OCI Object Storage
oci os object bulk-upload \
  --bucket-name "$OCI_BUCKET" \
  --namespace "$OCI_NAMESPACE" \
  --src-dir "$BACKUP_DIR" \
  --include "*.gz" \
  --overwrite

# Clean old backups locally
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete at $(date)"
```

**Set up cron:**

```bash
# /etc/cron.d/techhub-db-backup
0 2 * * * root /opt/techhub/scripts/backup-dbs.sh >> /var/log/techhub/db-backup.log 2>&1
```

### 5.5 Restore Procedure

```bash
#!/bin/bash
# /opt/techhub/scripts/restore-db.sh
# Usage: ./restore-db.sh <service_name> <backup_file>

SERVICE=$1
BACKUP_FILE=$2

if [ -z "$SERVICE" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <service_name> <backup_file>"
  echo "Service: products_db, inventory_db, orders_db, auth_db, notifications_db, audit_db"
  exit 1
fi

echo "Stopping service that uses $SERVICE..."
# Map DB to app service
case $SERVICE in
  products_db)    APP="product-service" ;;
  inventory_db)   APP="inventory-service" ;;
  orders_db)      APP="order-service" ;;
  auth_db)        APP="auth-service" ;;
  notifications_db) APP="notification-service" ;;
  audit_db)       APP="audit-service" ;;
esac

docker compose -f docker-compose.yaml -f docker-compose.prod.yaml stop "$APP"

echo "Dropping and recreating database..."
docker exec "$SERVICE" psql -U postgres -c "DROP DATABASE IF EXISTS ${SERVICE/_db/_db}_restore;"
docker exec "$SERVICE" psql -U postgres -c "CREATE DATABASE ${SERVICE/_db/_db}_restore;"

echo "Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$SERVICE" psql -U postgres -d "${SERVICE/_db/_db}_restore"

echo "Switching databases..."
docker exec "$SERVICE" psql -U postgres -c "DROP DATABASE ${SERVICE/_db/_db};"
docker exec "$SERVICE" psql -U postgres -c "ALTER DATABASE ${SERVICE/_db/_db}_restore RENAME TO ${SERVICE/_db/_db};"

echo "Restarting app service..."
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml start "$APP"

echo "Restore complete."
```

---

## 6. OCI Networking Setup

### 6.1 Network Architecture

```
Internet
   │
   ▼
[Public Subnet] ─── OCI Load Balancer (443)
   │
   ▼
[Private Subnet] ─── Compute Instance (Docker host)
                        │
                        ├── app containers (gateway, services, frontend)
                        ├── database containers (NEVER exposed)
                        └── rabbitmq, redis (internal only)
```

### 6.2 Create VCN and Subnets

```bash
VCN_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_CIDR="10.0.0.0/24"
PRIVATE_SUBNET_CIDR="10.0.1.0/24"

# Create VCN
VCN_OCID=$(oci network vcn create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-VCN" \
  --cidr-block "$VCN_CIDR" \
  --dns-label "techhub" \
  --query 'data.id' --raw-output)

# Create Internet Gateway
IG_OCID=$(oci network internet-gateway create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-IGW" \
  --is-enabled true \
  --query 'data.id' --raw-output)

# Create NAT Gateway (for private subnet outbound)
NAT_OCID=$(oci network nat-gateway create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-NAT" \
  --query 'data.id' --raw-output)

# Create Route Table for Public Subnet
RT_PUBLIC_OCID=$(oci network route-table create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-RT-Public" \
  --route-rules '[{"cidrBlock":"0.0.0.0/0","networkEntityId":"'$IG_OCID'"}]' \
  --query 'data.id' --raw-output)

# Create Route Table for Private Subnet (NAT for internet, local for VCN)
RT_PRIVATE_OCID=$(oci network route-table create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-RT-Private" \
  --route-rules '[{"cidrBlock":"0.0.0.0/0","networkEntityId":"'$NAT_OCID'"}]' \
  --query 'data.id' --raw-output)

# Create Security List for Public Subnet (allow LB traffic)
SL_PUBLIC_OCID=$(oci network security-list create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-SL-Public" \
  --ingress-security-rules '[
    {"sourceType":"CIDR","source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
    {"sourceType":"CIDR","source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}}
  ]' \
  --egress-security-rules '[
    {"destinationType":"CIDR","destination":"0.0.0.0/0","protocol":"all"}
  ]')

# Create Security List for Private Subnet (restrict to VCN internal)
SL_PRIVATE_OCID=$(oci network security-list create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-SL-Private" \
  --ingress-security-rules '[
    {"sourceType":"CIDR","source":"10.0.0.0/16","protocol":"all","description":"Internal VCN traffic"},
    {"sourceType":"CIDR","source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":22,"max":22}},"description":"SSH from anywhere (or restrict to your IP)"}
  ]' \
  --egress-security-rules '[
    {"destinationType":"CIDR","destination":"0.0.0.0/0","protocol":"all","description":"All outbound"}
  ]')

# Create Subnets
PUBLIC_SUBNET_OCID=$(oci network subnet create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-Subnet-Public" \
  --cidr-block "$PUBLIC_SUBNET_CIDR" \
  --route-table-id "$RT_PUBLIC_OCID" \
  --security-list-ids "[\"$SL_PUBLIC_OCID\"]" \
  --prohibit-public-ip-on-vnic false \
  --dns-label "public" \
  --query 'data.id' --raw-output)

PRIVATE_SUBNET_OCID=$(oci network subnet create \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_OCID" \
  --display-name "TechHub-Subnet-Private" \
  --cidr-block "$PRIVATE_SUBNET_CIDR" \
  --route-table-id "$RT_PRIVATE_OCID" \
  --security-list-ids "[\"$SL_PRIVATE_OCID\"]" \
  --prohibit-public-ip-on-vnic true \
  --dns-label "private" \
  --query 'data.id' --raw-output)
```

### 6.3 Launch Compute Instance in Private Subnet

```bash
oci compute instance launch \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-App" \
  --availability-domain "AD-1" \
  --shape "VM.Standard2.2" \
  --subnet-id "$PRIVATE_SUBNET_OCID" \
  --image-id "ocid1.image.oc1..oraclelinux9" \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
  --assign-public-ip false \
  --boot-volume-size-in-gbs 100
```

**Connect via bastion or port forwarding:**

```bash
# Option 1: OCI Bastion
oci bastion session create \
  --bastion-id "$BASTION_OCID" \
  --target-resource-id "$INSTANCE_OCID" \
  --session-type "SSH_PORT_FORWARDING" \
  --ssh-port "22"

# Option 2: Use a jump box (public instance in public subnet)
ssh -J opc@JUMP_BOX_PUBLIC_IP opc@PRIVATE_IP
```

---

## 7. Media Files — OCI Object Storage

### 7.1 Problem

Currently, product images are stored on the product-service container's local filesystem (`/app/media/`). This means:

- Images are lost when the container is recreated
- Can't scale to multiple instances
- No backup strategy (beyond Docker volumes)

### 7.2 Solution: django-storages + OCI Object Storage (S3-Compatible)

OCI Object Storage uses an S3-compatible API. This means `django-storages` works with the `s3boto3` backend.

**Create the bucket:**

```bash
OCI_NAMESPACE="your-tenancy-namespace"
OCI_BUCKET="techhub-media"

oci os bucket create \
  --compartment-id "$COMPARTMENT_OCID" \
  --namespace "$OCI_NAMESPACE" \
  --name "$OCI_BUCKET" \
  --public-access-type "ObjectPreauthenticatedRequest" \
  --storage-tier "Standard"

# Generate a pre-authenticated request URL for public read (or use the bucket's public URL)
oci os preauthenticated-request create \
  --namespace "$OCI_NAMESPACE" \
  --bucket-name "$OCI_BUCKET" \
  --name "public-read" \
  --access-type "AnyObjectRead" \
  --time-expires "2027-07-13T00:00:00Z"
```

**Create an API key for S3-compatible access:**

In OCI Console → Your Profile → API Keys → Add API Key. Save the private key and config.

### 7.3 Update Django Settings

```python
# product-service/product_service/settings.py

# Add to INSTALLED_APPS
INSTALLED_APPS += [
    'storages',
]

# Production-only settings
if not DEBUG:
    # OCI Object Storage (S3-compatible)
    AWS_ACCESS_KEY_ID = os.environ.get('OCI_S3_ACCESS_KEY')
    AWS_SECRET_ACCESS_KEY = os.environ.get('OCI_S3_SECRET_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('OCI_STORAGE_BUCKET_NAME', 'techhub-media')
    AWS_S3_ENDPOINT_URL = f"https://{os.environ.get('OCI_NAMESPACE')}.compat.objectstorage.{os.environ.get('OCI_REGION')}.oraclecloud.com"
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_DEFAULT_ACL = 'public-read'
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False

    # Override file storage
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f"{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/"
```

### 7.4 Update Nginx Media Proxy

When media is in Object Storage, the `/media/` proxy in Nginx should redirect to the bucket instead of proxying to product-service:

```nginx
# In nginx/nginx.conf — replace the old /media/ location
location /media/ {
    # Redirect to OCI Object Storage
    return 301 https://<namespace>.compat.objectstorage.<region>.oraclecloud.com/techhub-media/$1;
}
```

### 7.5 Migration Script

```python
#!/usr/bin/env python
# scripts/migrate_media_to_oci.py
"""
One-time migration of existing media files to OCI Object Storage.
Run before switching to production with S3 storage.
"""
import os
import sys
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'product_service.settings')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import django
django.conf settings

# Force S3 storage for migration
from django.core.files.storage import default_storage
from django.core.files import File

# Find all media files
media_root = Path(settings.MEDIA_ROOT)
files = list(media_root.rglob('*'))

for fpath in files:
    if fpath.is_file():
        relative_path = fpath.relative_to(media_root).as_posix()
        with open(fpath, 'rb') as f:
            django_file = File(f)
            saved_path = default_storage.save(relative_path, django_file)
            print(f"  → {relative_path} → {saved_path}")

print(f"Migrated {len([f for f in files if f.is_file()])} files.")
```

### 7.6 Update Frontend Image Configuration

In `next.config.js`, add the OCI Object Storage hostname:

```javascript
images: {
  remotePatterns: [
    // ... existing patterns ...
    {
      protocol: "https",
      hostname: "*.compat.objectstorage.*.oraclecloud.com",
    },
  ],
},
```

---

## 8. CI/CD Pipeline (GitHub Actions → OCI Container Registry)

### 8.1 Overview

The pipeline:

1. Developer pushes to `main` (or `production` branch)
2. GitHub Actions builds all Docker images
3. Pushes images to OCI Container Registry (OCIR)
4. SSHs into the production instance
5. Pulls new images, deploys via Docker Compose

### 8.2 OCI Container Registry Setup

```bash
# Create a repository for each service
for SERVICE in product-service inventory-service order-service auth-service notification-service audit-service frontend gateway; do
  oci artifacts container-repository create \
    --compartment-id "$COMPARTMENT_OCID" \
    --display-name "techhub/${SERVICE}" \
    --is-public false \
    --is-immutable false
done
```

**Create an auth token for GitHub Actions:**

OCI Console → Your Profile → Auth Tokens → Generate Token. Save it as a GitHub Actions secret.

### 8.3 GitHub Secrets

Add these to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `OCI_USER_OCID` | Your OCI user OCID |
| `OCI_TENANCY_OCID` | Your tenancy OCID |
| `OCI_FINGERPRINT` | API key fingerprint |
| `OCI_REGION` | e.g. `eu-frankfurt-1` |
| `OCI_NAMESPACE` | Tenancy namespace |
| `OCI_AUTH_TOKEN` | Auth token from step above |
| `OCI_SSH_HOST` | Compute instance private IP |
| `OCI_SSH_USER` | `opc` (for Oracle Linux) |
| `OCI_SSH_KEY` | Private SSH key (base64-encoded) |

### 8.4 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy to OCI

on:
  push:
    branches:
      - main
      - production
  workflow_dispatch:

env:
  OCI_REGION: eu-frankfurt-1
  OCI_REPOSITORY: iad.ocir.io/${{ vars.OCI_NAMESPACE }}/techhub

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - product-service
          - inventory-service
          - order-service
          - auth-service
          - notification-service
          - audit-service
          - frontend
          - gateway
    steps:
      - uses: actions/checkout@v4

      - name: Log in to OCI Container Registry
        run: |
          echo "${{ secrets.OCI_AUTH_TOKEN }}" | \
            docker login iad.ocir.io \
            --username "${{ secrets.OCI_NAMESPACE }}/${{ secrets.OCI_USER_OCID }}" \
            --password-stdin

      - name: Build and push ${{ matrix.service }}
        run: |
          IMAGE_TAG="${{ env.OCI_REPOSITORY }}/${{ matrix.service }}:${{ github.sha }}"
          IMAGE_LATEST="${{ env.OCI_REPOSITORY }}/${{ matrix.service }}:latest"

          # Build context varies per service
          case ${{ matrix.service }} in
            auth-service|notification-service|audit-service)
              docker build \
                -t "$IMAGE_TAG" \
                -t "$IMAGE_LATEST" \
                -f "./${{ matrix.service }}/Dockerfile" \
                ./${{ matrix.service }}
              ;;
            gateway)
              docker build \
                -t "$IMAGE_TAG" \
                -t "$IMAGE_LATEST" \
                -f "./nginx/Dockerfile" \
                ./nginx
              ;;
            frontend)
              docker build \
                -t "$IMAGE_TAG" \
                -t "$IMAGE_LATEST" \
                -f "./frontend/Dockerfile" \
                ./frontend
              ;;
            product-service|inventory-service|order-service)
              docker build \
                -t "$IMAGE_TAG" \
                -t "$IMAGE_LATEST" \
                -f "./${{ matrix.service }}/Dockerfile" \
                --build-context shared-lib=./shared-lib \
                .
              ;;
          esac

          docker push "$IMAGE_TAG"
          docker push "$IMAGE_LATEST"

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Copy production config to instance
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.OCI_SSH_HOST }}
          username: ${{ secrets.OCI_SSH_USER }}
          key: ${{ secrets.OCI_SSH_KEY }}
          source: "docker-compose.yaml,docker-compose.prod.yaml,.env.production"
          target: "/opt/techhub/"
          strip_components: 0

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.1.0
        with:
          host: ${{ secrets.OCI_SSH_HOST }}
          username: ${{ secrets.OCI_SSH_USER }}
          key: ${{ secrets.OCI_SSH_KEY }}
          script: |
            cd /opt/techhub

            # Log in to OCIR
            echo "${{ secrets.OCI_AUTH_TOKEN }}" | \
              docker login iad.ocir.io \
              --username "${{ secrets.OCI_NAMESPACE }}/${{ secrets.OCI_USER_OCID }}" \
              --password-stdin

            # Pull new images
            for SERVICE in product-service inventory-service order-service auth-service notification-service audit-service frontend gateway; do
              docker pull iad.ocir.io/${{ vars.OCI_NAMESPACE }}/techhub/${SERVICE}:latest
            done

            # Tag for local compose (or update compose to use OCIR images)
            # Deploy
            docker compose \
              -f docker-compose.yaml \
              -f docker-compose.prod.yaml \
              --env-file .env.production \
              up -d --remove-orphans

            # Clean old images
            docker image prune -f --filter "until=48h"
```

### 8.5 Update Docker Compose for OCIR Images

In `docker-compose.yaml` (or a production override), change build to image:

```yaml
services:
  product-service:
    image: iad.ocir.io/${OCI_NAMESPACE}/techhub/product-service:latest
    build: .  # Keep for local dev, override in CI
```

Or better: don't modify compose. CI should replace `build` with `image` dynamically, or maintain a separate `docker-compose.ci.yaml`.

---

## 9. Monitoring & Observability

### 9.1 Centralized Logging

All services already log to stdout in JSON format. This is the right pattern — let the container runtime handle log rotation.

**Option A: OCI Logging (Recommended for OCI)**

```bash
# Create a custom log group
oci logging log-group create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-Logs"

# Configure Docker to send to OCI Logging
# Install oci-logging-collector on the host
# Or use Fluentd sidecar
```

**Option B: Grafana Loki Stack (Self-Hosted)**

Add a Loki + Promtail + Grafana sidecar to your compose:

```yaml
services:
  loki:
    image: grafana/loki:3.0
    ports: ["3100:3100"]
    volumes:
      - ./loki-config.yaml:/etc/loki/loki-config.yaml
    command: -config.file=/etc/loki/loki-config.yaml
    deploy:
      resources:
        limits:
          memory: "256M"

  promtail:
    image: grafana/promtail:3.0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/promtail-config.yaml
    command: -config.file=/etc/promtail/promtail-config.yaml
    deploy:
      resources:
        limits:
          memory: "128M"

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]  # Access through gateway or restrict
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
    deploy:
      resources:
        limits:
          memory: "256M"
```

`promtail-config.yaml`:
```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'log_stream'
```

### 9.2 Metrics

**Option A: OCI Monitoring**

Create a custom metric namespace and push metrics from a script:

```bash
oci monitoring metric-data post \
  --namespace "techhub" \
  --metric-data '[{
    "name": "nginx_requests_total",
    "type": "counter",
    "values": [42],
    "compartmentId": "'$COMPARTMENT_OCID'"
  }]'
```

**Option B: Prometheus + Grafana**

Each service already has health endpoints. Add a Prometheus export sidecar or instrument each service:

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports: ["9090:9090"]
    deploy:
      resources:
        limits:
          memory: "256M"

  node_exporter:
    image: prom/node-exporter
    network_mode: host
    deploy:
      resources:
        limits:
          memory: "64M"
```

`prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'nginx'
    static_configs:
      - targets: ['gateway:8080']

  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15672']
```

### 9.3 Uptime Monitoring

**OCI Health Checks:**

```bash
oci health-checks http-monitor create \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "TechHub-Prod" \
  --targets '["https://techhub.example.com/health"]' \
  --protocol "HTTPS" \
  --interval-in-seconds "300" \
  --method "GET"
```

**UptimeRobot (Free — external monitoring):**

Create a monitor at https://uptimerobot.com pointing to `https://techhub.example.com/health`. Configure email alerts for downtime exceeding 5 minutes.

### 9.4 Alerting

Create an alerting script that checks key metrics and sends email:

```bash
#!/bin/bash
# /opt/techhub/scripts/alerts.sh

# Check service health
for URL in \
  http://localhost:8080/health \
  http://localhost:8000/api/health/ \
  http://localhost:8001/api/health/ \
  http://localhost:8002/api/health/ \
  http://localhost:3001/health \
  http://localhost:8003/health \
  http://localhost:8005/health; do

  STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$URL" --connect-timeout 5)
  if [ "$STATUS" != "200" ]; then
    echo "[ALERT] $URL is down (HTTP $STATUS)" | \
      mail -s "TechHub: Service Down - $(basename $URL)" "$ALERT_EMAIL"
  fi
done

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
  echo "[ALERT] Disk usage at ${DISK_USAGE}% on $(hostname)" | \
    mail -s "TechHub: Disk Space Alert" "$ALERT_EMAIL"
fi

# Check SSL expiry (if using Let's Encrypt directly)
DAYS_LEFT=$(openssl s_client -connect localhost:443 </dev/null 2>/dev/null \
  | openssl x509 -noout -checkend $((30*86400)) 2>&1)
if echo "$DAYS_LEFT" | grep -q "Certificate will expire"; then
  echo "[ALERT] SSL certificate expires within 30 days" | \
    mail -s "TechHub: SSL Expiry Alert" "$ALERT_EMAIL"
fi
```

Add to cron:

```bash
*/5 * * * * /opt/techhub/scripts/alerts.sh
```

---

## 10. Application-Level Production Fixes

### 10.1 Order Service: Fix Public Order Detail Endpoint

**CRITICAL.** Currently, `GET /api/orders/{id}/` is public (`AllowAny` in `get_permissions`). Any authenticated user can view any order's customer data.

**Fix** (`order-service/orders/views.py`):

```python
def get_permissions(self):
    # ...
    if self.action in ("list", "my", "retrieve"):
        # Change from IsAuthenticated() to IsAdminUser() for retrieve
        if self.action == "retrieve":
            return [IsAdminUser()]  # Only admin can view any order
        return [IsAuthenticated()]
    # ...
```

Alternatively, allow users to view only their own orders (already handled in `get_queryset`), but restrict unauthenticated retrieve:

```python
if self.action == "retrieve":
    return [IsAuthenticated()]  # Require auth, then filter in get_queryset
```

### 10.2 Order Service: Saga Compensation for Reserve Failure

**Problem:** When Stripe payment is confirmed but stock reservation fails, the order is cancelled and payment is marked "refunded" — but no actual Stripe refund is issued.

**Fix** (`_handle_webhook_completed` in `orders/views.py`):

```python
# After cancelling order due to reserve failure, issue Stripe refund
if not success:
    # Before cancelling, refund the payment
    try:
        stripe.Refund.create(
            payment_intent=order.stripe_payment_intent_id,
            reason="stock_unavailable",
        )
    except stripe.error.StripeError as e:
        logger.critical("Refund failed for order %s: %s", order.order_number, e)
        # Manual intervention required — alert admin
        send_admin_alert(f"Refund failed for order {order.order_number}")

    # Then release any partial reserves
    for pid, qty in succeeded:
        release_stock(...)
    # Then cancel order
```

### 10.3 Order Service: Stock Pre-Check Before Order Creation

**Problem:** Orders are accepted even if stock is insufficient. The customer goes through checkout, pays, and only then finds out the order is cancelled.

**Fix** (`order_service.stock_check` — new function):

```python
def check_stock_availability(items_data, inventory_service_url):
    """Verify sufficient stock before accepting order."""
    for item in items_data:
        # Query inventory-service for current stock
        import requests
        resp = requests.get(
            f"{inventory_service_url}/api/inventory/stock/",
            params={
                "product_id": item["product_id"],
                "warehouse_id": item.get("warehouse_id", ""),
            },
            timeout=5,
        )
        data = resp.json()
        if len(data) == 0 or data[0]["available"] < item["quantity"]:
            return False, f"Insufficient stock for product {item['product_id']}"
    return True, None
```

Call this in `create()` before proceeding:

```python
def create(self, request, *args, **kwargs):
    serializer = OrderCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    items_data = data.pop("items")

    # Pre-check stock
    available, error = check_stock_availability(
        items_data, settings.INVENTORY_SERVICE_URL
    )
    if not available:
        return Response(
            {"error": error},
            status=status.HTTP_409_CONFLICT,
        )

    order = svc.create_order(...)
```

### 10.4 Order Service: Order Number Collision

**Problem:** `order_number` is generated as timestamp + random suffix without a unique constraint. Under load, collisions are possible.

**Fix** — Add a unique constraint on the model and use a monotonic sequence:

```python
# order-service/orders/models.py
import shortuuid
from django.db import models

class Order(models.Model):
    order_number = models.CharField(
        max_length=20,
        unique=True,          # ← Add this
        db_index=True,
        default=shortuuid.uuid,
    )
```

Run migration:
```bash
python manage.py makemigrations orders
python manage.py migrate
```

### 10.5 Inventory Service: Internal Transfer Endpoint

**Problem:** No way to move stock between warehouses (e.g., from warehouse to showroom).

**Fix** — Add a transfer action:

```python
# inventory-service/inventory/views.py (in StockViewSet)

@action(detail=False, methods=["post"])
def transfer(self, request):
    """Transfer stock between warehouses."""
    serializer = StockTransferSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    product_id = data["product_id"]
    from_warehouse_id = data["from_warehouse_id"]
    to_warehouse_id = data["to_warehouse_id"]
    quantity = data["quantity"]

    with transaction.atomic():
        from_stock = Stock.objects.select_for_update().get(
            product_id=product_id, warehouse_id=from_warehouse_id
        )
        if from_stock.qty < quantity:
            return Response(
                {"error": "Insufficient stock"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        to_stock, _ = Stock.objects.get_or_create(
            product_id=product_id, warehouse_id=to_warehouse_id,
            defaults={"qty": 0, "reserved": 0},
        )

        from_stock.qty -= quantity
        from_stock.save()
        to_stock.qty += quantity
        to_stock.save()

        # Log movements
        StockMovement.objects.create(
            product_id=product_id, warehouse_id=to_warehouse_id,
            quantity=quantity, type="transfer",
            reference=f"transfer:{from_warehouse_id}->{to_warehouse_id}",
        )

    return Response({"status": "ok"})
```

Corresponding serializer:
```python
class StockTransferSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    from_warehouse_id = serializers.UUIDField()
    to_warehouse_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
```

### 10.6 Inventory Service: GRN Delete Reverses Stock

**Problem:** Deleting a GRN does not decrement stock.

**Fix** — Override `perform_destroy` on `GoodsReceiptNoteViewSet`:

```python
def perform_destroy(self, instance):
    with transaction.atomic():
        for item in instance.items.all():
            stock = Stock.objects.select_for_update().get(
                product_id=item.product_id,
                warehouse_id=instance.warehouse_id,
            )
            stock.qty -= item.quantity
            stock.save(update_fields=["qty"])

            # Log the reversal
            StockMovement.objects.create(
                product_id=item.product_id,
                warehouse_id=instance.warehouse_id,
                quantity=-item.quantity,
                type="adjustment",
                reference=f"grn-delete:{instance.id}",
            )
        instance.delete()
```

### 10.7 Notification Service: Stop Reading Auth DB Directly

**Problem:** Notification service reads `auth_db` directly to look up user email/name. This tightly couples the two services.

**Fix** — Call auth-service API instead:

```javascript
// notification-service/src/auth-client.js
async function getUser(userId) {
  const response = await fetch(`${process.env.AUTH_SERVICE_URL}/auth/admin/users/${userId}`, {
    headers: {
      'X-Gateway-User-Id': process.env.INTERNAL_SERVICE_ID,
      'X-Gateway-User-Role': 'admin',
    },
  });
  if (!response.ok) throw new Error(`Auth API error: ${response.status}`);
  return response.json();
}

module.exports = { getUser };
```

Then remove `AUTH_DATABASE_URL` from the service's environment.

### 10.8 Notification Service: SSE Scaling

**Problem:** SSE (Server-Sent Events) is single-process. If you scale to multiple instances, a user connected to instance A won't receive events from instance B.

**Fix** — Use Redis Pub/Sub:

```javascript
// notification-service/src/sse.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Subscribe to user-specific channels
redis.subscribe('notification:user:*', (err, count) => {
  if (err) logger.error('Redis subscribe failed', err);
});

redis.on('message', (channel, message) => {
  const userId = channel.split(':')[2];
  const connections = sseConnections.get(userId) || [];
  for (const res of connections) {
    res.write(`data: ${message}\n\n`);
  }
});

// When sending a notification, publish to Redis instead of writing directly
function sendNotification(userId, notification) {
  redis.publish(`notification:user:${userId}`, JSON.stringify(notification));
}
```

**Documentation:** If you don't implement this, at minimum document that notifications are single-process and a deployment with >1 instance requires Redis Pub/Sub.

### 10.9 Frontend: Production Environment File

Create `frontend/.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://techhub.example.com/api
NEXT_PUBLIC_AUTH_URL=https://techhub.example.com/auth
NEXT_PUBLIC_BASE_URL=https://techhub.example.com

API_SERVICE_URL=http://gateway:8080/api
PROXY_AUTH_URL=http://gateway:8080/auth

NODE_ENV=production
```

Build with:

```bash
cd frontend && npm run build
```

The Dockerfile's `npm run start` reads these from the environment (set in docker-compose.prod.yaml).

### 10.10 Frontend: Role-Based Route Gating

**Problem:** `proxy.ts` gates `/admin/*` but doesn't explicitly protect cashier routes (`/admin/pos`) and warehouse routes (`/admin/warehouses`). The catch-all at line 74 handles most cases but the explicit mappings are incomplete.

**Verify and ensure** the role route map covers all admin panel paths:

```typescript
const roleRouteAccess: Record<string, string[]> = {
  "/admin/summary": ["admin"],
  "/admin/pos": ["admin", "cashier"],
  "/admin/products": ["admin", "cashier"],
  "/admin/orders": ["admin", "cashier"],
  "/admin/warehouses": ["admin", "warehouse_worker"],
  "/admin/stock-movements": ["admin", "warehouse_worker"],
  "/admin/goods-receipts": ["admin", "warehouse_worker"],
  "/admin/suppliers": ["admin", "warehouse_worker"],
  "/admin/categories": ["admin"],
  "/admin/users": ["admin"],
  "/admin/reports": ["admin"],
  // Add missing paths:
  "/admin/dashboard": ["admin"],
  "/admin/analytics": ["admin"],       // if exists
  "/admin/settings": ["admin"],         // if exists
  "/admin/notifications": ["admin", "cashier", "warehouse_worker"],  // if exists
};
```

The catch-all at line 74 (`localePath.startsWith("/admin") && userRole !== "admin"`) already redirects non-admins. So cashier trying to access `/admin/suppliers` would be redirected because it's not explicitly allowed for cashier and the catch-all blocks it. This actually works correctly — confirm by adding explicit tests.

### 10.11 Django Services: Add Health Endpoints

**Problem:** Product, inventory, and order services don't have dedicated health endpoints. The nginx health check probes a regular API endpoint.

**Fix** — Add a health view to each Django service:

```python
# product-service/products/views.py (or a dedicated health app)
from django.db import connections
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    """Health check verifying DB connectivity."""
    db_conn = connections['default']
    try:
        cursor = db_conn.cursor()
        cursor.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    return Response({
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    })
```

Add to `urls.py`:

```python
urlpatterns = [
    path('api/health/', health, name='health'),
    # ... existing patterns
]
```

---

## 11. Performance & Scaling Guide

### 11.1 Gunicorn Worker Tuning

**Formula:** `workers = (2 * CPU_COUNT) + 1`

On the OCI compute instance:

```bash
# Get CPU count
nproc  # e.g., 4

# Workers = 9
```

| vCPUs | Workers | Threads (with `--threads`) |
|-------|---------|---------------------------|
| 1     | 3       | 6 (2 per worker)          |
| 2     | 5       | 10                        |
| 4     | 9       | 18                        |
| 8     | 17      | 34                        |

Update all Django services in `docker-compose.prod.yaml`:

```yaml
command: >
  sh -c "python manage.py migrate &&
         gunicorn product_service.wsgi:application
           -w $((2 * $(nproc) + 1))
           --threads 2
           --worker-class gthread
           --max-requests 1000
           --max-requests-jitter 100
           --bind 0.0.0.0:8000
           --log-level info
           --access-logfile -
           --error-logfile -
           --timeout 120"
```

**Key flags explained:**

| Flag | Purpose |
|------|---------|
| `-w` | Worker count — more workers = more concurrent requests |
| `--threads` | Per-worker threads — use when app does I/O (DB queries) |
| `--worker-class gthread` | Threaded worker — handles more concurrent connections than sync workers |
| `--max-requests` | Restart worker after N requests (prevents memory leaks) |
| `--max-requests-jitter` | +/- randomness to avoid all workers restarting at once |
| `--timeout` | Kill workers stuck for >120s |

### 11.2 RabbitMQ High Availability

RabbitMQ in Docker Compose is single-node. For production, configure mirrored queues:

```bash
# Set HA policy on TechHub exchange
docker exec rabbitmq rabbitmqctl set_policy ha-all \
  ".*" \
  '{"ha-mode":"all","ha-sync-mode":"automatic"}' \
  --priority 1 \
  --apply-to queues
```

For true HA, run a RabbitMQ cluster (3+ nodes) — which requires a separate deployment outside Docker Compose.

### 11.3 Redis Persistence

**Problem:** Redis in dev uses no persistence. Restart loses sessions, rate limiter state, and SSE Pub/Sub data.

**Fix** — Enable AOF (Append-Only File) in production:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: >
      redis-server
        --appendonly yes
        --appendfsync everysec
        --auto-aof-rewrite-percentage 100
        --auto-aof-rewrite-min-size 64mb
        --save ""
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: "512M"
```

**Note:** Disable RDB snapshots (`--save ""`) if using AOF, to avoid double write overhead.

### 11.4 Django Connection Pooling

Direct connections to PostgreSQL from each gunicorn worker can exhaust DB connections:

- 9 workers × 6 databases = 54 connections minimum
- OCI PostgreSQL free tier limits connections (~50 default)

**Solution: PgBouncer Sidecar**

Add PgBouncer between Django and PostgreSQL:

```yaml
services:
  pgbouncer_products:
    image: edoburu/pgbouncer:latest
    environment:
      DB_HOST: products_db
      DB_PORT: "5432"
      DB_USER: postgres
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 100
      DEFAULT_POOL_SIZE: 10
    depends_on:
      - products_db
    networks:
      - microservices_network
    deploy:
      resources:
        limits:
          memory: "64M"
```

Then point Django to PgBouncer:

```yaml
product-service:
  environment:
    DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@pgbouncer_products:5432/${POSTGRES_DB}
```

### 11.5 Next.js Production Tuning

**Enable output file tracing** (reduces image size):

```javascript
// next.config.js
module.exports = withNextIntl({
  output: "standalone",  // Reduces image size by 80%
  // ...
});
```

**Configure ISR for product pages** (if dynamic product data):

```javascript
// frontend/app/[locale]/products/[id]/page.tsx
export const revalidate = 60; // ISR: revalidate every 60 seconds
```

**Set up caching headers in nginx** for static assets:

```nginx
location /_next/static/ {
    proxy_pass http://frontend:3000;
    expires 365d;
    add_header Cache-Control "public, immutable";
}

location /static/ {
    alias /app/static/;
    expires 7d;
    add_header Cache-Control "public";
}
```

### 11.6 Nginx Production Tuning

```nginx
# Increase worker connections for production
events {
    worker_connections 2048;     # Increased from 1024
    multi_accept on;
    use epoll;                   # Linux-specific high-performance I/O
}

http {
    # Buffer sizes
    proxy_buffers 16 16k;
    proxy_buffer_size 32k;
    proxy_busy_buffers_size 64k;

    # Timeouts — more generous for slow clients
    proxy_read_timeout 60s;
    proxy_connect_timeout 30s;

    # Static asset caching
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

---

## 12. Backup & Disaster Recovery

### 12.1 Backup Strategy Summary

| Data | Frequency | Tool | Target | Retention |
|------|-----------|------|--------|-----------|
| PostgreSQL databases | Daily | `pg_dump` + cron | OCI Object Storage | 30 days |
| Media files | Real-time | S3 storage | OCI Object Storage | N/A (versioning) |
| Docker volumes | Weekly | `tar` + cron | OCI Object Storage | 90 days |
| Application configs | Per-deploy | Git | GitHub | Forever |
| Compose files | Per-deploy | Git | GitHub | Forever |

### 12.2 Database Backup (Detailed)

Already covered in §5.4. Add cross-region replication for critical backups:

```bash
# Replicate backup bucket to another region
oci os replication create \
  --bucket-name "techhub-db-backups" \
  --destination-region "eu-frankfurt-1" \
  --destination-bucket-name "techhub-db-backups-dr"
```

### 12.3 Docker Volume Backup

```bash
#!/bin/bash
# /opt/techhub/scripts/backup-volumes.sh

BACKUP_DIR="/data/backups/volumes"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=90
OCI_BUCKET="techhub-volume-backups"

mkdir -p "$BACKUP_DIR"

# Stop services that write to these volumes
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml stop product-service inventory-service order-service

# Backup volumes
for VOLUME in postgres_products_data postgres_inventory_data postgres_orders_data \
              postgres_auth_data postgres_notifications_data postgres_audit_data redis_data; do
  docker run --rm \
    -v ${VOLUME}:/source \
    -v ${BACKUP_DIR}:/backup \
    alpine tar czf /backup/${VOLUME}_${TIMESTAMP}.tar.gz -C /source .
done

# Restart services
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml start product-service inventory-service order-service

# Upload to OCI
oci os object bulk-upload \
  --bucket-name "$OCI_BUCKET" \
  --src-dir "$BACKUP_DIR" \
  --include "*.tar.gz"

find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
```

### 12.4 Recovery Runbook

#### Full System Recovery (after catastrophic failure)

```bash
# 1. Provision new compute instance in OCI
# 2. Install Docker, git, OCI CLI
# 3. Clone repository
git clone https://github.com/yourorg/techhub.git /opt/techhub
cd /opt/techhub

# 4. Restore secrets from OCI Vault
/opt/techhub/scripts/fetch-secrets.sh

# 5. Restore media from Object Storage
oci os object bulk-download \
  --bucket-name "techhub-media" \
  --dest-dir "/opt/techhub/media-restore"

# 6. Restore database from latest backup
LATEST_BACKUP=$(oci os object list \
  --bucket-name "techhub-db-backups" \
  --prefix "products_db" \
  --query 'data[-1].name' --raw-output)

oci os object get \
  --bucket-name "techhub-db-backups" \
  --name "$LATEST_BACKUP" \
  --file "/tmp/restore.sql.gz"

# Restore each database (see §5.5)

# 7. Start the stack
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml \
  --env-file /opt/techhub/secrets/.env.production up -d

# 8. Verify health
curl -f https://techhub.example.com/health
echo "Recovery complete."
```

#### Single Service Recovery

```bash
# Restart a single service
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml restart order-service

# Roll back a single service to previous image
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml \
  run --rm order-service \
  sh -c "python manage.py migrate"
```

### 12.5 Test Recovery Quarterly

Automate a recovery drill:

```bash
#!/bin/bash
# /opt/techhub/scripts/recovery-drill.sh
# Run quarterly to verify backups are restorable

BACKUP_FILE=$(oci os object list \
  --bucket-name "techhub-db-backups" \
  --prefix "products_db" \
  --query 'data[-1].name' --raw-output)

oci os object get \
  --bucket-name "techhub-db-backups" \
  --name "$BACKUP_FILE" \
  --file "/tmp/drill-restore.sql.gz"

# Verify dump integrity
gunzip -t /tmp/drill-restore.sql.gz
if [ $? -ne 0 ]; then
  echo "[DRILL FAILED] Backup corrupt: $BACKUP_FILE"
  exit 1
fi

# Start a throwaway Postgres container and restore into it
docker run --rm -d --name drill-restore \
  -e POSTGRES_PASSWORD=drill \
  -v /tmp/drill-restore.sql.gz:/tmp/restore.sql.gz \
  postgres:15-alpine

sleep 5
gunzip -c /tmp/drill-restore.sql.gz | \
  docker exec -i drill-restore psql -U postgres

if [ $? -eq 0 ]; then
  echo "[DRILL PASSED] Backup restorable: $BACKUP_FILE"
else
  echo "[DRILL FAILED] Restore error: $BACKUP_FILE"
fi

docker stop drill-restore
rm -f /tmp/drill-restore.sql.gz
```

Add to cron:
```bash
0 3 1 */3 * /opt/techhub/scripts/recovery-drill.sh >> /var/log/techhub/drill.log
```

---

## 13. Production Checklist

Use this checklist to verify every prerequisite before going live.

### Security

- [ ] **Secrets rotated** — Google, GitHub, Stripe, Resend keys all regenerated
- [ ] **Secrets moved to OCI Vault** — No secrets in `.env` or code
- [ ] `.env` added to `.gitignore` — Never committed again
- [ ] `.env.example` sanitized — Contains placeholders, no real values
- [ ] **Git history scrubbed** — `git filter-branch` if `.env` was committed
- [ ] **SSL/TLS configured** — OCI LB with certificate or Let's Encrypt
- [ ] HSTS headers set — `Strict-Transport-Security` with `preload`
- [ ] Cookie `secure=true` — In Better Auth config
- [ ] `DEBUG=False` — On all Django services
- [ ] **`ALLOWED_HOSTS` updated** — Include only production domains
- [ ] CORS origins restricted — Only production domains in `CORS_ORIGINS`
- [ ] Database ports not exposed to host — `ports: []` for all DBs
- [ ] Database strong passwords — 32+ chars, generated with `openssl rand`
- [ ] RabbitMQ default user/password changed — Not `techhub/techhub`
- [ ] Redis password set (if exposed) — Use `--requirepass`

### Configuration

- [ ] **Bind mounts removed** — `volumes: []` in production override
- [ ] **Production commands configured** — `npm run build && npm run start`, gunicorn without `--reload`
- [ ] **Healthchecks added** — Every service has `healthcheck:` block
- [ ] **Restart policies set** — `restart: always` or `unless-stopped`
- [ ] **Resource limits set** — `deploy.resources.limits.memory` for every service
- [ ] Gunicorn workers tuned — `$((2 * $(nproc) + 1))`
- [ ] Connection pooling added — PgBouncer sidecar for each Django service
- [ ] RabbitMQ HA policy set — `ha-mode: all` for queues
- [ ] Redis AOF persistence enabled — `--appendonly yes`
- [ ] Nginx tuned — `worker_connections 2048`, proper buffer sizes

### Infrastructure

- [ ] **VCN created** — Public + private subnets
- [ ] **NAT Gateway configured** — Private subnet has outbound internet
- [ ] **Security lists restrictive** — Only ports 443 inbound to LB, SSH from restricted IP
- [ ] **OCI Load Balancer created** — 443 listener, backend set to instance:80
- [ ] **DNS configured** — A record pointing to LB public IP
- [ ] **Database backups configured** — Daily `pg_dump` to Object Storage
- [ ] **Database backup cron installed** — `/etc/cron.d/techhub-db-backup`
- [ ] **Media moved to Object Storage** — django-storages with S3-compatible endpoint
- [ ] **CI/CD pipeline set up** — GitHub Actions → OCIR → deploy
- [ ] **Monitoring configured** — Loki/Promtail or OCI Logging
- [ ] **Uptime monitoring configured** — OCI Health Checks or UptimeRobot
- [ ] **Alerting configured** — Email alerts for downtime, disk, SSL

### Code Fixes

- [ ] **Order detail not public** — Fixed permissions in `orders/views.py`
- [ ] **Saga compensation** — Stripe refund on reserve failure
- [ ] **Stock pre-check** — Verify availability before order creation
- [ ] **Order number unique constraint** — Added `unique=True`
- [ ] **Inventory transfer endpoint** — Stock movement between warehouses
- [ ] **Inventory adjustment/write-off endpoints** — Stock corrections
- [ ] **GRN delete reverses stock** — `perform_destroy` override
- [ ] **Notification service: auth via API** — Not direct DB read
- [ ] **SSE documented or fixed** — Redis Pub/Sub or single-process limitation documented
- [ ] **Frontend `.env.production` created** — Production API URLs
- [ ] **Frontend role routes verified** — Cashier/warehouse paths gated in `proxy.ts`
- [ ] **Health endpoints added** — All Django services have `/api/health/`

### Pre-Launch Verification

- [ ] **Load testing completed** — k6 or wrk test at expected traffic level
- [ ] **Security audit passed** — Scan for CVEs in Docker images
- [ ] **Backup recovery tested** — Quarterly drill passes
- [ ] **Rollback procedure documented** — Know how to revert a deployment
- [ ] **Runbook printed** — Key commands accessible without internet access

### Launch Day

- [ ] Final DB dump before switch
- [ ] Switch DNS to production IP
- [ ] Verify HTTPS works from multiple locations
- [ ] Monitor logs for first 30 minutes
- [ ] Test OAuth login (Google, GitHub)
- [ ] Test Stripe payment (use test card `4242...`)
- [ ] Verify SSE notifications work
- [ ] Trigger a backup and verify
- [ ] Celebrate

---

> **Document Version:** 1.0
> **Last Updated:** 2026-07-13
> **Maintainer:** Project maintainer (update this file as the infrastructure evolves)
