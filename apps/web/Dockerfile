ARG NODE_IMAGE=node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/web apps/web
COPY packages/shared packages/shared

RUN pnpm --filter @the-dmz/shared build \
  && pnpm --filter @the-dmz/web build

# Build a dedicated production dependency graph in an isolated workspace.
RUN mkdir -p /runtime/apps/web /runtime/packages/shared \
  && cp package.json pnpm-lock.yaml pnpm-workspace.yaml /runtime/ \
  && cp apps/web/package.json /runtime/apps/web/package.json \
  && cp packages/shared/package.json /runtime/packages/shared/package.json \
  && cp -R packages/shared/dist /runtime/packages/shared/dist \
  && cd /runtime \
  && corepack enable \
  && corepack prepare pnpm@9.0.0 --activate \
  && pnpm install --frozen-lockfile --prod --ignore-scripts --filter @the-dmz/web...

FROM ${NODE_IMAGE} AS runtime
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VCS_REF

WORKDIR /app

RUN apk add --no-cache curl \
  && addgroup -S app \
  && adduser -S app -G app

ENV NODE_ENV=${NODE_ENV}
ENV PORT=3000
ENV ORIGIN=http://localhost:3000

LABEL org.opencontainers.image.source="https://github.com/matrices-gmbh/the-dmz"
LABEL org.opencontainers.image.description="The DMZ: Archive Gate - Web Server"
LABEL org.opencontainers.image.licenses="UNLICENSED"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"

COPY --from=build /runtime/node_modules /app/node_modules
COPY --from=build /runtime/apps/web/node_modules /app/apps/web/node_modules
COPY --from=build /runtime/packages/shared/node_modules /app/packages/shared/node_modules
COPY --from=build /runtime/apps/web/package.json /app/apps/web/package.json
COPY --from=build /runtime/packages/shared/package.json /app/packages/shared/package.json
COPY --from=build /app/packages/shared/dist /app/packages/shared/dist
COPY --from=build /app/apps/web/build /app/build

RUN find /app -type f -name '*.ts' ! -name '*.d.ts' -delete

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "build/index.js"]
