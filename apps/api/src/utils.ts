import { randomUUID } from "node:crypto";

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const jitter = (base: number, spread: number): number =>
  base + (Math.random() * 2 - 1) * spread;

export const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const pct = (value: number, decimals = 2): number =>
  Number(value.toFixed(decimals));

export const id = (): string => randomUUID();

export const nowIso = (): string => new Date().toISOString();
