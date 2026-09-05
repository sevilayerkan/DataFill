import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

// jsdom lacks ResizeObserver (needed by Radix Select/Slider). Minimal no-op mock.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// Persisted UI state (language via fadelytext-language, theme via next-themes)
// lives in localStorage and would otherwise leak between tests in the same file.
beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = "en";
  window.history.replaceState(null, "", "/");
});
