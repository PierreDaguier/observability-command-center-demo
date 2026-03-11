import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../");

const store = createStore();
const output = {
  generatedAt: new Date().toISOString(),
  services: store.getServiceCards(),
  timeseries: store.getTimeseries(45),
  alerts: store.getAlerts(),
  replayScenarios: store.listScenarios(),
};

const target = path.join(repoRoot, "data/seed/telemetry-seed.json");
writeFileSync(target, JSON.stringify(output, null, 2));

console.log(`Seed dataset written to ${target}`);
