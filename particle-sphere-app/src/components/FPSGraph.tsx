import React, { useEffect, useRef, useState } from 'react';

interface FPSGraphProps {
  fps: number;
  maxPoints?: number;
  width?: number;
  height?: number;
  targetFps?: number;
}

const FPSGraph: React.FC<FPSGraphProps> = ({ 
  fps, 
  maxPoints = 60, 
  width = 200, 
  height = 60,
  targetFps = 60
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  // Update FPS history
  useEffect(() => {
    setFpsHistory(prev => {
      const newHistory = [...prev, fps];
      if (newHistory.length > maxPoints) {
        newHistory.shift();
      }
      return newHistory;
    });
  }, [fps, maxPoints]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Draw target FPS line
    const targetY = height - (targetFps / 120) * height;
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (fpsHistory.length < 2) return;

    // Draw FPS graph
    const pointSpacing = width / maxPoints;
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    fpsHistory.forEach((fpsValue, index) => {
      const x = index * pointSpacing;
      const y = height - (fpsValue / 120) * height; // Scale to 0-120 FPS range
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Color based on performance
    const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
    if (avgFps >= targetFps * 0.9) {
      ctx.strokeStyle = '#00ff00'; // Green - good
    } else if (avgFps >= targetFps * 0.6) {
      ctx.strokeStyle = '#ffff00'; // Yellow - ok
    } else {
      ctx.strokeStyle = '#ff0000'; // Red - poor
    }
    
    ctx.stroke();

    // Draw glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.stroke();

    // Draw current FPS text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${Math.round(fps)} FPS`, 5, 15);

    // Draw min/max
    if (fpsHistory.length > 0) {
      const minFps = Math.min(...fpsHistory);
      const maxFps = Math.max(...fpsHistory);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px monospace';
      ctx.fillText(`${Math.round(minFps)}-${Math.round(maxFps)}`, 5, height - 5);
    }

  }, [fpsHistory, width, height, fps, maxPoints, targetFps]);

  return (
    <div style={{ 
      display: 'inline-block',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      borderRadius: '4px',
      overflow: 'hidden',
      backgroundColor: 'rgba(0, 0, 0, 0.6)'
    }}>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default FPSGraph;

