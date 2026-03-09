# Hosting Local — Guía de Deployment sin Nube

## Opción A: Localhost + Cloudflare Tunnel (GRATIS, recomendada)

### Prerequisitos
- Docker Desktop instalado en tu PC
- Cuenta gratuita de Cloudflare (solo email)

### 1. Levantar el backend

```bash
cd backend

# Crear .env desde template
cp .env.example .env

# Editar .env con un SECRET_KEY real (32+ chars)
# Ejemplo: openssl rand -hex 32

# Levantar todo
docker compose up -d

# Verificar
curl http://localhost:8000/health
```

### 2. Instalar Cloudflare Tunnel (cloudflared)

**Windows:**
```powershell
winget install Cloudflare.cloudflared
```

**macOS:**
```bash
brew install cloudflared
```

**Linux:**
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 3. Exponer el backend

**Opción rápida (sin dominio, URL temporal):**
```bash
cloudflared tunnel --url http://localhost:8000
```
Esto te da una URL tipo `https://random-words.trycloudflare.com` — funciona inmediatamente.

**Opción permanente (con dominio propio, gratis en Cloudflare):**
```bash
# Login (una sola vez)
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create maracuya

# Configurar ruta DNS
cloudflared tunnel route dns maracuya api.tudominio.com

# Crear config
cat > ~/.cloudflared/config.yml << EOF
tunnel: maracuya
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.tudominio.com
    service: http://localhost:8000
  - service: http_status:404
EOF

# Ejecutar
cloudflared tunnel run maracuya
```

### 4. Configurar la app móvil

En `mobile/.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://random-words.trycloudflare.com/api/v1
```

O con dominio propio:
```
EXPO_PUBLIC_API_BASE_URL=https://api.tudominio.com/api/v1
```

### 5. Actualizar CORS en backend

En `backend/.env`:
```
CORS_ORIGINS=https://random-words.trycloudflare.com,exp://192.168.1.X:8081
```

---

## Opción B: Oracle Cloud Always Free (GRATIS permanente, 24GB RAM)

### Por qué Oracle
- **Gratis para siempre** (no trial de 12 meses)
- VM ARM con 4 OCPU + 24GB RAM — sobra para TF inference
- IP pública fija incluida

### Setup

```bash
# 1. Crear cuenta en cloud.oracle.com (tarjeta requerida pero no cobran)

# 2. Crear VM: Ampere A1, 4 OCPU, 24GB RAM, Ubuntu 22.04
#    (en Compute → Instances → Create Instance)

# 3. SSH a la VM
ssh -i tu-key.pem ubuntu@<IP_PUBLICA>

# 4. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# 5. Clonar repo y levantar
git clone https://github.com/zsoist/MaracuyAI.git
cd MaracuyAI/backend
cp .env.example .env
# Editar .env (SECRET_KEY, CORS_ORIGINS)
docker compose up -d

# 6. Abrir puertos en Oracle Network Security
#    VCN → Subnet → Security List → Ingress: TCP 8000 from 0.0.0.0/0

# 7. Configurar en mobile/.env:
#    EXPO_PUBLIC_API_BASE_URL=http://<IP_PUBLICA>:8000/api/v1
```

### Añadir HTTPS (recomendado)

```bash
# Instalar Caddy como reverse proxy (auto-SSL)
sudo apt install -y caddy

# Configurar /etc/caddy/Caddyfile:
api.tudominio.com {
    reverse_proxy localhost:8000
}

sudo systemctl restart caddy
```

---

## Opción C: Hetzner VPS (€3.29/mes)

Mismo proceso que Oracle pero pagando. Ventaja: setup en 2 minutos, más confiable.

```bash
# Crear servidor CAX11 (ARM64, 2 vCPU, 4GB RAM) en console.hetzner.cloud
# Ubuntu 24.04, SSH key

ssh root@<IP>
apt update && apt install -y docker.io docker-compose-v2
git clone https://github.com/zsoist/MaracuyAI.git
cd MaracuyAI/backend
cp .env.example .env
# Editar .env
docker compose up -d
```

---

## Comparación

| Aspecto | Localhost + Tunnel | Oracle Free | Hetzner €3.29 |
|---------|-------------------|-------------|---------------|
| Costo | $0 | $0 | €3.29/mes |
| Uptime | Solo con PC encendida | 24/7 | 24/7 |
| RAM disponible | Tu PC | 24GB | 4GB |
| Setup | 5 min | 30 min | 15 min |
| HTTPS | Automático (Cloudflare) | Manual (Caddy) | Manual (Caddy) |
| Latencia | Depende de tu ISP | ~50ms | ~20ms |
| Para beta/dev | ✅ Ideal | Overkill | Overkill |
| Para producción | ❌ No confiable | ✅ Si es estable | ✅ Recomendado |

**Recomendación:** Empieza con Localhost + Cloudflare Tunnel para desarrollo y beta testing. Cuando tengas usuarios reales, migra a Oracle Free o Hetzner.
