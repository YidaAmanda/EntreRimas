# ── Etapa 1: compilação ───────────────────────────────────────────────────────
FROM haskell:9.6 AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

COPY backend/SitePoesias.cabal ./
RUN cabal update && cabal build --only-dependencies

COPY backend/ .
RUN cabal build && \
    cp $(cabal list-bin SitePoesias) /build/SitePoesias

# ── Etapa 2: imagem final mínima ──────────────────────────────────────────────
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    libpq5 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/SitePoesias .

EXPOSE 8080
CMD ["./SitePoesias"]
