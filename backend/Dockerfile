# ── Etapa 1: compilação ───────────────────────────────────────────────────────
FROM haskell:9.6 AS builder
WORKDIR /build

# Instala libpq-dev necessário para compilar postgresql-simple
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

# Copia o cabal e baixa dependências primeiro (cache de camadas)
COPY SitePoesias.cabal ./
RUN cabal update && cabal build --only-dependencies

# Copia o restante e compila
COPY . .
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
