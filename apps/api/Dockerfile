ARG NODE_IMAGE=node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @the-dmz/shared build \
  && pnpm --filter @the-dmz/api build

# Build a dedicated production dependency graph in an isolated workspace.
RUN mkdir -p /runtime/apps/api /runtime/packages/shared \
  && cp package.json pnpm-lock.yaml pnpm-workspace.yaml /runtime/ \
  && cp apps/api/package.json /runtime/apps/api/package.json \
  && cp packages/shared/package.json /runtime/packages/shared/package.json \
  && cp -R packages/shared/dist /runtime/packages/shared/dist \
  && cd /runtime \
  && corepack enable \
  && corepack prepare pnpm@9.0.0 --activate \
  && pnpm install --frozen-lockfile --prod --ignore-scripts --filter @the-dmz/api...

FROM ${NODE_IMAGE} AS runtime
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VCS_REF

WORKDIR /app

RUN apk add --no-cache curl \
  && addgroup -S app \
  && adduser -S app -G app

ENV NODE_ENV=${NODE_ENV}
ENV PORT=3001

LABEL org.opencontainers.image.source="https://github.com/matrices-gmbh/the-dmz"
LABEL org.opencontainers.image.description="The DMZ: Archive Gate - API Server"
LABEL org.opencontainers.image.licenses="UNLICENSED"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"

COPY --from=build /runtime/node_modules /app/node_modules
COPY --from=build /runtime/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build /runtime/packages/shared/node_modules /app/packages/shared/node_modules
COPY --from=build /runtime/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /runtime/packages/shared/package.json /app/packages/shared/package.json
COPY --from=build /app/packages/shared/dist /app/packages/shared/dist

RUN find /app -type f -name '*.ts' ! -name '*.d.ts' -delete

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["sh", "-ec", "if [ -z \"${JWT_SECRET:-}\" ]; then export JWT_SECRET=\"$(node -e 'process.stdout.write(require(\"node:crypto\").randomBytes(32).toString(\"hex\"))')\"; fi; exec node apps/api/dist/server.js"]
