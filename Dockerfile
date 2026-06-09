# ── Etapa 1: compilação ───────────────────────────────────────────────────────
FROM haskell:9.6 AS builder
WORKDIR /build

# haskell:9.6 usa Debian Bullseye que tem libpq 13; postgresql-libpq-configure
# requer >= 14.12, então adicionamos o repositório PGDG para obter libpq 16.
RUN apt-get update && apt-get install -y curl gnupg2 && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg && \
    . /etc/os-release && \
    echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
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
RUN apt-get update && apt-get install -y curl gnupg2 && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg && \
    . /etc/os-release && \
    echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && apt-get install -y libpq5 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/SitePoesias .

EXPOSE 8080
CMD ["./SitePoesias"]
