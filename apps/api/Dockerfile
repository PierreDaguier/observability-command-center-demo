FROM node:20-alpine AS builder
WORKDIR /workspace
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install --workspace=@occ/api --include-workspace-root
COPY apps/api apps/api
COPY data data
RUN npm run build -w @occ/api

FROM node:20-alpine AS runtime
WORKDIR /workspace
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install --omit=dev --workspace=@occ/api --include-workspace-root
COPY --from=builder /workspace/apps/api/dist apps/api/dist
COPY data data
ENV API_PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start", "-w", "@occ/api"]
