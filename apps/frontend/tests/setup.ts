import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver or matchMedia, both of which
// CodeMirror and our theme-detection code touch. Minimal stand-ins keep
// component tests from crashing on things unrelated to what they're testing.
if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof window.matchMedia === "undefined") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!navigator.clipboard) {
  Object.assign(navigator, {
    clipboard: { writeText: async () => {} },
  });
}
