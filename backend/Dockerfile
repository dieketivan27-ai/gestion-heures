# ─────────────────────────────────────────────────────────────
# Build multi-stage : dépendances de prod uniquement
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─────────────────────────────────────────────────────────────
# Image finale : utilisateur non-root, pas de devDependencies
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Sécurité : utilisateur non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copie uniquement le nécessaire
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Répertoire uploads avec les bonnes permissions
RUN mkdir -p src/uploads/avatars && chown -R appuser:appgroup /app

USER appuser

# Render injecte PORT dynamiquement (défaut 8080 si absent)
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/server.js"]
