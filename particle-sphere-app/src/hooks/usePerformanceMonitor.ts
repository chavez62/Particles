import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  particleCount: number;
  memoryUsage: number | null;
  gpuTier: number;
  qualityLevel: number;
}

interface QualitySettings {
  particleCount: number;
  effectsLevel: number;
  renderScale: number;
}

interface PerformanceMonitorOptions {
  initialParticleCount: number;
  targetFps?: number;
  adjustQuality?: boolean;
  minParticleCount?: number;
  maxParticleCount?: number;
  particleCountStep?: number;
}

// GPU detection helper
const getGPUTier = (): Promise<number> => {
  return new Promise((resolve) => {
    // Basic detection based on WebGL capabilities
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) {
        resolve(0); // No WebGL support
        return;
      }
      
      // Get WebGL extensions and parameters
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {
        resolve(1); // Basic WebGL support but no debug info
        return;
      }
      
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      
      // Check for known high-performance GPU patterns
      const isHighEnd = /nvidia|rtx|gtx|radeon|adreno 6|apple gpu/i.test(renderer);
      const isMidRange = /intel|amd|adreno 5|mali-g/i.test(renderer);
      
      if (isHighEnd) resolve(3); // High-end GPU
      else if (isMidRange) resolve(2); // Mid-range GPU
      else resolve(1); // Low-end GPU
    } catch (e) {
      resolve(1); // Default to low tier on error
    }
  });
};

const usePerformanceMonitor = (options: PerformanceMonitorOptions) => {
  const {
    initialParticleCount,
    targetFps = 50,
    adjustQuality = true,
    minParticleCount = initialParticleCount * 0.2,
    maxParticleCount = initialParticleCount * 2,
    particleCountStep = initialParticleCount * 0.1
  } = options;
  
  // Current quality settings
  const [quality, setQuality] = useState<QualitySettings>({
    particleCount: initialParticleCount,
    effectsLevel: 1,
    renderScale: 1
  });
  
  // Performance metrics
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    particleCount: initialParticleCount,
    memoryUsage: null,
    gpuTier: 1,
    qualityLevel: 2 // Medium by default
  });
  
  // Performance monitoring state with proper cleanup
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const rafRef = useRef<number>();
  const fpsHistoryRef = useRef<number[]>([]);
  const adjustQualityTimeoutRef = useRef<number>();
  const stabilityCounterRef = useRef(0);
  const isComponentMountedRef = useRef(true);
  
  // Initialize GPU detection
  useEffect(() => {
    getGPUTier().then(tier => {
      if (!isComponentMountedRef.current) return;
      
      setMetrics(prev => ({ ...prev, gpuTier: tier }));
      
      // Initial quality preset based on GPU tier
      if (tier === 3) {
        // High-end GPU - can handle more particles
        setQuality({
          particleCount: Math.min(maxParticleCount, initialParticleCount * 1.5),
          effectsLevel: 2,
          renderScale: 1.0
        });
      } else if (tier === 1) {
        // Low-end GPU - reduce initial quality
        setQuality({
          particleCount: Math.max(minParticleCount, initialParticleCount * 0.5),
          effectsLevel: 0,
          renderScale: 0.75
        });
      }
    });
    
    return () => {
      isComponentMountedRef.current = false;
    };
  }, [initialParticleCount, maxParticleCount, minParticleCount]);
  
  // Update metrics periodically with better performance
  useEffect(() => {
    let lastUpdateTime = performance.now();
    
    const updateMetrics = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      
      // Calculate FPS
      const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
      
      // Calculate average frame time more efficiently
      const frameTime = frameTimesRef.current.length > 0
        ? frameTimesRef.current.reduce((sum, time) => sum + time, 0) / frameTimesRef.current.length
        : 0;
      
      // Get memory usage if available (throttled to reduce overhead)
      let memoryUsage = null;
      if (window.performance && 'memory' in window.performance) {
        memoryUsage = (window.performance as any).memory.usedJSHeapSize / (1024 * 1024);
      }
      
      // Update metrics with function instead of object to prevent closure retention
      if (isComponentMountedRef.current) {
        setMetrics(prev => ({
          ...prev,
          fps,
          frameTime,
          particleCount: quality.particleCount,
          memoryUsage
        }));
      }
      
      // Store FPS history for adaptive quality with fixed size
      fpsHistoryRef.current.push(fps);
      while (fpsHistoryRef.current.length > 5) {
        fpsHistoryRef.current.shift();
      }
      
      // Reset frame counters
      frameCountRef.current = 0;
      frameTimesRef.current.length = 0; // Faster than creating a new array
      lastTimeRef.current = currentTime;
    };
    
    // Function to run in animation frame
    const animationLoop = () => {
      if (!isComponentMountedRef.current) return;
      
      const now = performance.now();
      const elapsed = now - lastUpdateTime;
      
      // Only update metrics once per second to reduce overhead
      if (elapsed >= 1000) {
        updateMetrics();
        lastUpdateTime = now;
      }
      
      // Schedule next update
      rafRef.current = requestAnimationFrame(animationLoop);
    };
    
    // Start the animation loop
    rafRef.current = requestAnimationFrame(animationLoop);
    
    // Cleanup function
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      
      // Clear arrays to prevent memory leaks
      frameTimesRef.current = [];
      fpsHistoryRef.current = [];
    };
  }, [quality.particleCount]);
  
  // Adaptive quality adjustment with better cleanup
  useEffect(() => {
    if (!adjustQuality) return;
    
    const adjustQualityBasedOnPerformance = () => {
      if (!isComponentMountedRef.current) return;
      if (fpsHistoryRef.current.length < 3) return; // Need enough data
      
      // Calculate average FPS
      const avgFps = fpsHistoryRef.current.reduce((sum, fps) => sum + fps, 0) / fpsHistoryRef.current.length;
      
      // Determine how far we are from target FPS
      const fpsDeficit = targetFps - avgFps;
      
      // If performance is stable, increment counter
      if (Math.abs(fpsDeficit) < 5) {
        stabilityCounterRef.current++;
      } else {
        stabilityCounterRef.current = 0;
      }
      
      // Only adjust quality after several stable readings or if performance is very poor
      if (stabilityCounterRef.current >= 3 || fpsDeficit > 15) {
        stabilityCounterRef.current = 0;
        
        if (fpsDeficit > 5) {
          // Performance is too low, reduce quality
          setQuality(prev => {
            const newParticleCount = Math.max(
              minParticleCount,
              prev.particleCount - particleCountStep
            );
            
            // If we're already at minimum particles, reduce effects level
            const effectsLevel = newParticleCount === prev.particleCount && prev.effectsLevel > 0
              ? prev.effectsLevel - 1
              : prev.effectsLevel;
              
            // If effects are at minimum, reduce render scale as last resort
            const renderScale = newParticleCount === prev.particleCount && 
                                effectsLevel === prev.effectsLevel &&
                                prev.renderScale > 0.5
              ? Math.max(0.5, prev.renderScale - 0.1)
              : prev.renderScale;
              
            return {
              particleCount: newParticleCount,
              effectsLevel,
              renderScale
            };
          });
          
          // Update quality level (Low)
          setMetrics(prev => ({ ...prev, qualityLevel: 1 }));
        } else if (fpsDeficit < -10 && avgFps > targetFps + 15) {
          // Performance is good, increase quality
          setQuality(prev => {
            // First increase render scale to 1.0
            if (prev.renderScale < 0.95) {
              return {
                ...prev,
                renderScale: Math.min(1.0, prev.renderScale + 0.1)
              };
            }
            
            // Then increase effects level if not at max
            if (prev.effectsLevel < 2) {
              return {
                ...prev,
                effectsLevel: prev.effectsLevel + 1
              };
            }
            
            // Finally increase particle count
            return {
              ...prev,
              particleCount: Math.min(maxParticleCount, prev.particleCount + particleCountStep)
            };
          });
          
          // Update quality level (High)
          setMetrics(prev => ({ ...prev, qualityLevel: 3 }));
        } else {
          // Update quality level (Medium)
          setMetrics(prev => ({ ...prev, qualityLevel: 2 }));
        }
      }
      
      // Schedule next check if component is still mounted
      if (isComponentMountedRef.current) {
        adjustQualityTimeoutRef.current = window.setTimeout(adjustQualityBasedOnPerformance, 3000);
      }
    };
    
    // Start the adjustment cycle
    adjustQualityTimeoutRef.current = window.setTimeout(adjustQualityBasedOnPerformance, 3000);
    
    // Cleanup function
    return () => {
      if (adjustQualityTimeoutRef.current) {
        clearTimeout(adjustQualityTimeoutRef.current);
        adjustQualityTimeoutRef.current = undefined;
      }
    };
  }, [adjustQuality, targetFps, minParticleCount, maxParticleCount, particleCountStep]);
  
  // Record frame timing with optimized performance
  const recordFrame = useCallback((frameDuration?: number) => {
    if (!isComponentMountedRef.current) return;
    
    frameCountRef.current++;
    
    if (frameDuration) {
      frameTimesRef.current.push(frameDuration);
      // Keep limited history to avoid memory growth
      while (frameTimesRef.current.length > 30) {
        frameTimesRef.current.shift();
      }
    }
  }, []);
  
  // Method to force a specific quality setting
  const setQualityLevel = useCallback((level: 'low' | 'medium' | 'high') => {
    if (!isComponentMountedRef.current) return;
    
    switch (level) {
      case 'low':
        setQuality({
          particleCount: Math.max(minParticleCount, initialParticleCount * 0.5),
          effectsLevel: 0,
          renderScale: 0.75
        });
        setMetrics(prev => ({ ...prev, qualityLevel: 1 }));
        break;
      case 'medium':
        setQuality({
          particleCount: initialParticleCount,
          effectsLevel: 1,
          renderScale: 1.0
        });
        setMetrics(prev => ({ ...prev, qualityLevel: 2 }));
        break;
      case 'high':
        setQuality({
          particleCount: Math.min(maxParticleCount, initialParticleCount * 1.5),
          effectsLevel: 2,
          renderScale: 1.0
        });
        setMetrics(prev => ({ ...prev, qualityLevel: 3 }));
        break;
    }
  }, [initialParticleCount, minParticleCount, maxParticleCount]);
  
  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;
      
      // Clean up any remaining resources
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      if (adjustQualityTimeoutRef.current) {
        clearTimeout(adjustQualityTimeoutRef.current);
      }
      
      // Clear arrays
      frameTimesRef.current = [];
      fpsHistoryRef.current = [];
    };
  }, []);

  return {
    metrics,
    quality,
    recordFrame,
    setQualityLevel
  };
};

export default usePerformanceMonitor;