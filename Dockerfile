# ── Etapa 1: compilação ───────────────────────────────────────────────────────
FROM haskell:9.6 AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y curl gnupg lsb-release && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && apt-get install -y libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/SitePoesias.cabal ./
RUN cabal update && cabal build --only-dependencies

COPY backend/ .
RUN cabal build && \
    cp $(cabal list-bin SitePoesias) /build/SitePoesias

# ── Etapa 2: imagem final mínima ──────────────────────────────────────────────
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y curl gnupg lsb-release && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && apt-get install -y libpq5 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/SitePoesias .

EXPOSE 8080
CMD ["./SitePoesias"]
