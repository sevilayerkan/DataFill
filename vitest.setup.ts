import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom lacks ResizeObserver (needed by Radix Select/Slider). Minimal no-op mock.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);
