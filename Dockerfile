# ==============================================================================
# JPP-POLISAS — Production Dockerfile
# High-performance multi-stage compilation for ultra-fast, lightweight builds.
# ==============================================================================

# --- Stage 1: Build & Compile React SPA ---
FROM node:22-alpine AS builder

# Pasang git sekiranya diperlukan oleh Vite/scripts semasa compile
RUN apk add --no-cache git

WORKDIR /app

# Salin manifest dependensi terlebih dahulu untuk optimumkan Docker cache layer
COPY package*.json ./

# Pasang semua dependensi (termasuk devDependencies) untuk build React
RUN npm ci --legacy-peer-deps

# Salin seluruh kod sumber aplikasi
COPY . .

# Jalankan arahan compile React ke folder /dist
RUN npm run build

# --- Stage 2: Runtime Production Environment ---
FROM node:22-alpine AS runner

WORKDIR /app

# Tetapkan pembolehubah persekitaran (environment variables)
ENV NODE_ENV=production
ENV PORT=8000

# Salin manifest dependensi ke runner stage
COPY package*.json ./

# Hanya pasang production dependencies sahaja (mengecilkan saiz image secara drastik)
RUN npm ci --only=production --legacy-peer-deps

# Salin fail runtime yang kritikal
COPY server.js ./
COPY clubs.json ./

# Salin hasil kompilasi React frontend dari builder stage ke runner stage
COPY --from=builder /app/dist ./dist

# Dedahkan port aplikasi
EXPOSE 8000

# Jalankan pelayan Express backend
CMD ["node", "server.js"]
