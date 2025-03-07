import React, { useState, useCallback, memo, Suspense, lazy, useEffect, useRef } from "react";
import usePerformanceMonitor from "./hooks/usePerformanceMonitor";
import WebGLDebug from "./components/WebGLDebug";

// Add TypeScript declaration for gc
declare global {
  interface Window {
    gc?: () => void;
  }
}

// Lazy load components with preloading
const visualComponents = {
  particles: lazy(() => import("./components/ParticleSphere")),
  neurons: lazy(() => import("./components/Neurons")),
  simple: lazy(() => import("./components/SimpleSparkles"))
};

// Preload all components
const preloadComponents = () => {
  Object.values(visualComponents).forEach(() => {
    const preloadComponent = () => {
      return new Promise(resolve => {
        // Just importing is enough to preload
        resolve(true);
      });
    };
    preloadComponent();
  });
};

// Component default particle counts - reduced for better performance
const componentParticleCounts = {
  particles: 2000,
  neurons: 150,
  simple: 3000
};

type VisualizationType = 'particles' | 'neurons' | 'simple';
type QualityLevel = 'low' | 'medium' | 'high' | 'auto';

interface NavButtonProps {
  type: VisualizationType;
  isActive: boolean;
  onClick: (type: VisualizationType) => void;
  children: React.ReactNode;
}

interface QualityButtonProps {
  level: QualityLevel;
  isActive: boolean;
  onClick: (level: QualityLevel) => void;
  children: React.ReactNode;
}

// Loading component
const LoadingFallback = () => (
  <div className="loading-screen">
    <div className="loading-dot"></div>
  </div>
);

// Memoized navigation button component
const NavButton = memo(({ type, isActive, onClick, children }: NavButtonProps) => {
  const handleClick = useCallback(() => {
    onClick(type);
  }, [onClick, type]);

  return (
    <button
      onClick={handleClick}
      className={`nav-button ${isActive ? 'active' : ''}`}
    >
      {children}
    </button>
  );
});

NavButton.displayName = 'NavButton';

// Memoized quality button component
const QualityButton = memo(({ level, isActive, onClick, children }: QualityButtonProps) => {
  const handleClick = useCallback(() => {
    onClick(level);
  }, [onClick, level]);

  return (
    <button
      onClick={handleClick}
      className={`quality-button ${isActive ? 'active' : ''} ${level}`}
    >
      {children}
    </button>
  );
});

QualityButton.displayName = 'QualityButton';

// Performance stats component
const PerformanceStats = memo(({ 
  fps, 
  particleCount, 
  memoryUsage, 
  gpuTier, 
  qualityLevel 
}: { 
  fps: number; 
  particleCount: number;
  memoryUsage: number | null;
  gpuTier: number;
  qualityLevel: number;
}) => {
  
  const getQualityLabel = (level: number) => {
    switch(level) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      default: return 'Unknown';
    }
  };
  
  const getGpuTierLabel = (tier: number) => {
    switch(tier) {
      case 0: return 'No WebGL';
      case 1: return 'Low-end';
      case 2: return 'Mid-range';
      case 3: return 'High-end';
      default: return 'Unknown';
    }
  };
  
  return (
    <div className="performance-stats">
      <div><span>FPS:</span> {fps}</div>
      <div><span>Particles:</span> {particleCount.toLocaleString()}</div>
      {memoryUsage !== null && <div><span>Memory:</span> {memoryUsage.toFixed(1)} MB</div>}
      <div><span>GPU:</span> {getGpuTierLabel(gpuTier)}</div>
      <div><span>Quality:</span> {getQualityLabel(qualityLevel)}</div>
    </div>
  );
});

PerformanceStats.displayName = 'PerformanceStats';

// Visualization wrapper component with shared context and settings
const VisualizationWrapper = memo(({ 
  component: Component, 
  isVisible,
  quality,
  onFrameRecord
}: { 
  component: React.ComponentType<any>; 
  isVisible: boolean;
  quality: any;
  onFrameRecord: (duration?: number) => void;
}) => {
  // Pass quality settings and frame recorder to visualization components
  return isVisible ? (
    <Component 
      quality={quality} 
      onFrameRecord={onFrameRecord} 
    />
  ) : null;
});

VisualizationWrapper.displayName = 'VisualizationWrapper';

const App: React.FC = () => {
  const [activeViz, setActiveViz] = useState<VisualizationType>('simple');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<QualityLevel>('auto');
  
  // Start time for measuring frame duration
  const frameStartTimeRef = useRef<number>(0);
  
  // Initialize performance monitor with current visualization's particle count
  const performance = usePerformanceMonitor({
    initialParticleCount: componentParticleCounts[activeViz],
    targetFps: 30, // Reduced target FPS for better stability
    adjustQuality: qualityPreset === 'auto',
    minParticleCount: componentParticleCounts[activeViz] * 0.2,
    maxParticleCount: componentParticleCounts[activeViz] * 1.5 // Reduced maximum
  });
  
  // Handle frame recording for performance monitoring
  const handleFrameRecord = useCallback((duration?: number) => {
    if (!duration) {
      const now = window.performance.now();
      if (frameStartTimeRef.current === 0) {
        frameStartTimeRef.current = now;
        performance.recordFrame();
      } else {
        const frameDuration = now - frameStartTimeRef.current;
        frameStartTimeRef.current = now;
        performance.recordFrame(frameDuration);
      }
    } else {
      performance.recordFrame(duration);
    }
  }, [performance]);

  // Preload components on initial mount
  useEffect(() => {
    preloadComponents();
  }, []);
  
  // Toggle performance stats display
  const toggleStats = useCallback(() => {
    setShowStats(prev => !prev);
  }, []);
  
  // Toggle quality selector
  const toggleQualitySelector = useCallback(() => {
    setShowQualitySelector(prev => !prev);
  }, []);
  
  // Handle quality level change
  const handleQualityChange = useCallback((level: QualityLevel) => {
    setQualityPreset(level);
    
    // Apply quality preset or enable auto-adjust
    if (level !== 'auto') {
      performance.setQualityLevel(level);
    }
  }, [performance]);

  // Handle visualization change
  const handleVisualizationChange = useCallback((type: VisualizationType) => {
    if (type !== activeViz) {
      setIsTransitioning(true);
      
      // Force garbage collection of previous visualization
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          console.log('GC not available');
        }
      }
      
      setTimeout(() => {
        setActiveViz(type);
        frameStartTimeRef.current = 0;
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 300);
    }
  }, [activeViz]);

  // Get current component
  const CurrentVisualization = visualComponents[activeViz];

  const [showDebug, setShowDebug] = useState(true);
  
  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);

  return (
    <>
      <style>
        {`
          .nav-container {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            gap: 15px;
            padding: 15px;
            border-radius: 12px;
            background-color: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          .nav-button, .quality-button {
            padding: 12px 24px;
            background-color: rgba(0, 0, 0, 0.6);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: monospace;
            font-size: 14px;
            letter-spacing: 1px;
            text-transform: uppercase;
            backdrop-filter: blur(4px);
          }

          .nav-button:hover, .quality-button:hover {
            background-color: rgba(0, 255, 255, 0.1);
            border-color: #00ffff;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
          }

          .nav-button.active, .quality-button.active {
            color: #00ffff;
            border-color: #00ffff;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5),
                       0 0 20px rgba(0, 255, 255, 0.3),
                       inset 0 0 10px rgba(0, 255, 255, 0.2);
          }
          
          .quality-button.low {
            color: #ff9999;
          }
          
          .quality-button.medium {
            color: #ffff99;
          }
          
          .quality-button.high {
            color: #99ff99;
          }
          
          .quality-button.auto {
            color: #99ccff;
          }
          
          .quality-button.active.low {
            border-color: #ff6666;
            box-shadow: 0 0 10px rgba(255, 102, 102, 0.5),
                       0 0 20px rgba(255, 102, 102, 0.3),
                       inset 0 0 10px rgba(255, 102, 102, 0.2);
          }
          
          .quality-button.active.medium {
            border-color: #ffff66;
            box-shadow: 0 0 10px rgba(255, 255, 102, 0.5),
                       0 0 20px rgba(255, 255, 102, 0.3),
                       inset 0 0 10px rgba(255, 255, 102, 0.2);
          }
          
          .quality-button.active.high {
            border-color: #66ff66;
            box-shadow: 0 0 10px rgba(102, 255, 102, 0.5),
                       0 0 20px rgba(102, 255, 102, 0.3),
                       inset 0 0 10px rgba(102, 255, 102, 0.2);
          }
          
          .quality-button.active.auto {
            border-color: #66ccff;
            box-shadow: 0 0 10px rgba(102, 204, 255, 0.5),
                       0 0 20px rgba(102, 204, 255, 0.3),
                       inset 0 0 10px rgba(102, 204, 255, 0.2);
          }

          .visualization-container {
            position: relative;
            width: 100%;
            height: 100%;
            opacity: 1;
            transition: opacity 0.3s ease-in-out;
          }

          .visualization-container.transitioning {
            opacity: 0;
          }

          .loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 999;
          }

          .loading-dot {
            width: 20px;
            height: 20px;
            background: #00ffff;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
          }
          
          .performance-stats {
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 15px;
            background-color: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 8px;
            color: #00ffff;
            font-family: monospace;
            font-size: 14px;
            backdrop-filter: blur(4px);
            z-index: 1000;
            transition: all 0.3s ease;
          }
          
          .performance-stats div {
            margin: 5px 0;
          }
          
          .performance-stats span {
            display: inline-block;
            width: 80px;
            color: rgba(255, 255, 255, 0.7);
          }
          
          .utility-buttons {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
          }
          
          .utility-button {
            width: 50px;
            height: 50px;
            background-color: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 50%;
            color: rgba(0, 255, 255, 0.8);
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(4px);
          }
          
          .utility-button:hover {
            background-color: rgba(0, 255, 255, 0.1);
            border-color: #00ffff;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          }
          
          .quality-selector {
            position: fixed;
            top: 85px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            gap: 10px;
            padding: 15px;
            border-radius: 12px;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s ease;
          }
          
          .quality-selector.visible {
            opacity: 1;
            pointer-events: auto;
          }

          @keyframes pulse {
            0% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
            100% {
              transform: scale(0.8);
              opacity: 0.5;
            }
          }
        `}
      </style>
      <div style={{ height: "100vh", backgroundColor: "#000" }}>
        <div className="nav-container">
          <NavButton
            type="particles"
            isActive={activeViz === 'particles'}
            onClick={handleVisualizationChange}
          >
            Particle Sphere
          </NavButton>
          <NavButton
            type="neurons"
            isActive={activeViz === 'neurons'}
            onClick={handleVisualizationChange}
          >
            Neurons
          </NavButton>
          <NavButton
            type="simple"
            isActive={activeViz === 'simple'}
            onClick={handleVisualizationChange}
          >
            Interactive Sparkles
          </NavButton>
        </div>
        
        <div className={`quality-selector ${showQualitySelector ? 'visible' : ''}`}>
          <QualityButton
            level="low"
            isActive={qualityPreset === 'low'}
            onClick={handleQualityChange}
          >
            Low
          </QualityButton>
          <QualityButton
            level="medium"
            isActive={qualityPreset === 'medium'}
            onClick={handleQualityChange}
          >
            Medium
          </QualityButton>
          <QualityButton
            level="high"
            isActive={qualityPreset === 'high'}
            onClick={handleQualityChange}
          >
            High
          </QualityButton>
          <QualityButton
            level="auto"
            isActive={qualityPreset === 'auto'}
            onClick={handleQualityChange}
          >
            Auto
          </QualityButton>
        </div>
        
        {showStats && (
          <PerformanceStats 
            fps={performance.metrics.fps}
            particleCount={performance.metrics.particleCount}
            memoryUsage={performance.metrics.memoryUsage}
            gpuTier={performance.metrics.gpuTier}
            qualityLevel={performance.metrics.qualityLevel}
          />
        )}
        
        <div className="utility-buttons">
          <button 
            className="utility-button" 
            onClick={toggleStats} 
            title="Toggle Performance Stats"
          >
            📊
          </button>
          <button 
            className="utility-button" 
            onClick={toggleQualitySelector} 
            title="Quality Settings"
          >
            ⚙️
          </button>
          <button 
            className="utility-button" 
            onClick={toggleDebug} 
            title="WebGL Debug"
          >
            🔍
          </button>
        </div>
        
        {showDebug && <WebGLDebug />}
        
        <div className={`visualization-container ${isTransitioning ? 'transitioning' : ''}`}>
          <Suspense fallback={<LoadingFallback />}>
            <VisualizationWrapper
              component={CurrentVisualization}
              isVisible={!isTransitioning}
              quality={performance.quality}
              onFrameRecord={handleFrameRecord}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
};

export default App;
