import { vi } from 'vitest';

/** Polyfill yang dibutuhkan React Flow saat berjalan di jsdom. */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

if (!('DOMMatrixReadOnly' in globalThis)) {
  class DOMMatrixStub {
    m22 = 1;
    constructor(_transform?: string) {}
    scale() {
      return this;
    }
    multiply() {
      return this;
    }
  }
  (globalThis as unknown as { DOMMatrixReadOnly: unknown }).DOMMatrixReadOnly = DOMMatrixStub;
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (!(SVGElement.prototype as { getBBox?: unknown }).getBBox) {
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 10, height: 10 }) as DOMRect;
}

Object.defineProperty(URL, 'createObjectURL', { writable: true, value: vi.fn(() => 'blob:nota') });
Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: vi.fn() });

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  font: '',
  measureText: (text: string) => ({ width: text.length * 6.2 }),
  drawImage: () => {},
  clearRect: () => {},
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
