import "@testing-library/jest-dom";

class ResizeObserverMock {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

if (!("ResizeObserver" in globalThis)) {
  // Recharts relies on ResizeObserver in responsive containers.
  // JSDOM does not implement it, so tests need a minimal stub.
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock;
}
