FROM node:20-alpine AS builder
WORKDIR /workspace
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install --workspace=@occ/web --include-workspace-root
COPY apps/web apps/web
RUN npm run build -w @occ/web

FROM node:20-alpine AS runtime
WORKDIR /workspace
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install --omit=dev --workspace=@occ/web --include-workspace-root
COPY --from=builder /workspace/apps/web/dist apps/web/dist
EXPOSE 4173
CMD ["npm", "run", "preview", "-w", "@occ/web"]
