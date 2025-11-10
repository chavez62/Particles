import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock WebGL context
class MockWebGLRenderingContext {
  canvas = document.createElement('canvas');
  getParameter() {
    return 4096;
  }
  getExtension(name: string) {
    if (name === 'WEBGL_debug_renderer_info') {
      return {
        UNMASKED_RENDERER_WEBGL: 37446,
        UNMASKED_VENDOR_WEBGL: 37445
      };
    }
    if (name === 'WEBGL_lose_context') {
      return {
        loseContext: vi.fn()
      };
    }
    return null;
  }
  getSupportedExtensions() {
    return ['WEBGL_debug_renderer_info'];
  }
}

// Mock HTMLCanvasElement.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
    return new MockWebGLRenderingContext() as any;
  }
  return originalGetContext.call(this, contextId as any);
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) as unknown as number;
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock performance.now
global.performance.now = vi.fn(() => Date.now());

