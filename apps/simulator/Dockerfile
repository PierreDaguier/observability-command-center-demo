FROM node:20-alpine AS builder
WORKDIR /workspace
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/simulator/package.json apps/simulator/package.json
RUN npm install --workspace=@occ/simulator --include-workspace-root
COPY apps/simulator apps/simulator
COPY data data
RUN npm run build -w @occ/simulator

FROM node:20-alpine AS runtime
WORKDIR /workspace
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/simulator/package.json apps/simulator/package.json
RUN npm install --omit=dev --workspace=@occ/simulator --include-workspace-root
COPY --from=builder /workspace/apps/simulator/dist apps/simulator/dist
COPY data data
ENV API_URL=http://api:8080
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
ENV LOG_FILE=/var/log/occ/simulator.log
VOLUME ["/var/log/occ"]
CMD ["npm", "run", "start", "-w", "@occ/simulator"]
