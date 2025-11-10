import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import usePerformanceMonitor from '../usePerformanceMonitor';

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({
        initialParticleCount: 1000
      })
    );

    expect(result.current.quality.particleCount).toBe(1000);
    expect(result.current.metrics.fps).toBe(0);
  });

  it('should record frames and update FPS', async () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({
        initialParticleCount: 1000,
        targetFps: 60
      })
    );

    act(() => {
      // Simulate recording 60 frames
      for (let i = 0; i < 60; i++) {
        result.current.recordFrame(16);
      }
    });

    // Advance timers to trigger metrics update
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.metrics.fps).toBeGreaterThan(0);
    });
  });

  it('should adjust quality when adjustQuality is enabled', async () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({
        initialParticleCount: 1000,
        targetFps: 60,
        adjustQuality: true,
        minParticleCount: 500,
        maxParticleCount: 2000
      })
    );

    const initialParticleCount = result.current.quality.particleCount;

    // Simulate poor performance (low FPS)
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.recordFrame(50); // Slow frames
      }
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(result.current.quality.particleCount).toBeLessThanOrEqual(initialParticleCount);
    }, { timeout: 5000 });
  });

  it('should allow manual quality level setting', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({
        initialParticleCount: 1000,
        minParticleCount: 500,
        maxParticleCount: 2000
      })
    );

    act(() => {
      result.current.setQualityLevel('low');
    });

    expect(result.current.quality.effectsLevel).toBe(0);
    expect(result.current.quality.renderScale).toBe(0.75);
    expect(result.current.metrics.qualityLevel).toBe(1);
  });

  it('should respect min and max particle count boundaries', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({
        initialParticleCount: 1000,
        minParticleCount: 800,
        maxParticleCount: 1200
      })
    );

    act(() => {
      result.current.setQualityLevel('low');
    });

    expect(result.current.quality.particleCount).toBeGreaterThanOrEqual(800);

    act(() => {
      result.current.setQualityLevel('high');
    });

    expect(result.current.quality.particleCount).toBeLessThanOrEqual(1200);
  });
});

