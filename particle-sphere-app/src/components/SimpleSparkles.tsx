import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { QualitySettings } from '../hooks/usePerformanceMonitor';
import useThreeSetup from '../hooks/useThreeSetup';

interface ParticleSettings {
  particleCount: number;
  particleSize: number;
  speed: number;
  glowIntensity: number;
  rotationSpeed: number;
}

interface SimpleSparklesProps {
  quality?: QualitySettings;
  onFrameRecord?: (duration?: number) => void;
  particleSettings?: ParticleSettings;
}

const SimpleSparkles: React.FC<SimpleSparklesProps> = ({ quality, onFrameRecord, particleSettings }) => {
  const { mountRef, sceneRef, rendererRef, controlsRef, requestRef } = useThreeSetup();
  const particlesRef = useRef<THREE.Points | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  
  // Use refs for dynamic settings that shouldn't cause scene rebuild
  const speedRef = useRef(particleSettings?.speed ?? 1);
  const rotationSpeedRef = useRef(particleSettings?.rotationSpeed ?? 1);
  
  // Update refs when settings change
  useEffect(() => {
    speedRef.current = particleSettings?.speed ?? 1;
    rotationSpeedRef.current = particleSettings?.rotationSpeed ?? 1;
  }, [particleSettings?.speed, particleSettings?.rotationSpeed]);
  
  // Handle mouse move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }, []);

  const resolvedParticleCount = useMemo(() => {
    if (particleSettings?.particleCount) {
      return Math.floor(particleSettings.particleCount);
    }
    return Math.max(500, Math.floor(quality?.particleCount ?? 3000));
  }, [quality?.particleCount, particleSettings?.particleCount]);

  const particleSize = useMemo(() => {
    if (particleSettings?.particleSize) {
      return particleSettings.particleSize * 0.05; // Scale to appropriate size
    }
    if (!quality) return 0.1;
    switch (quality.effectsLevel) {
      case 0:
        return 0.08;
      case 2:
        return 0.12;
      default:
        return 0.1;
    }
  }, [quality, particleSettings?.particleSize]);
  
  // Setup scene
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !controlsRef.current) {
      return;
    }
    
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current;
    const camera = controls.object as THREE.PerspectiveCamera;
    
    // Set camera position
    camera.position.z = 15;
    
    // Create particles
    const particleCount = resolvedParticleCount;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Create particles in a sphere shape
    const radius = 5;
    for (let i = 0; i < particleCount; i++) {
      // Random position using spherical coordinates for even distribution
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Blue-teal color palette
      colors[i * 3] = 0.1 + Math.random() * 0.3;     // r
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.3; // g
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.3; // b
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create material with glow intensity
    const glowIntensity = particleSettings?.glowIntensity ?? 1;
    const particleMaterial = new THREE.PointsMaterial({
      size: particleSize,
      vertexColors: true,
      transparent: true,
      opacity: Math.min(0.8 * glowIntensity, 1),
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    // Create points object
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add event listener
    window.addEventListener('mousemove', handleMouseMove);
    
    // Animation loop
    const animate = () => {
      const frameStart = performance.now();
      
      if (particlesRef.current) {
        // Rotate particles using ref value (no scene rebuild needed)
        particlesRef.current.rotation.y += 0.002 * rotationSpeedRef.current;
        
        // If mouse is in scene, interact with particles
        if (mouseRef.current.x !== 0 || mouseRef.current.y !== 0) {
          const positions = particlesRef.current.geometry.attributes.position;
          const array = positions.array as Float32Array;
          
          // Create simple interactive effect
          for (let i = 0; i < array.length; i += 3) {
            // Get current particle position
            const x = array[i];
            const y = array[i + 1];
            
            // Calculate distance to mouse in screen space
            const dx = x - (mouseRef.current.x * 10);
            const dy = y - (mouseRef.current.y * 10);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Apply small repulsion effect (scaled by animation speed from ref)
            if (dist < 3) {
              const angle = Math.atan2(dy, dx);
              const force = 0.05 * (1 - dist / 3) * speedRef.current;
              array[i] += Math.cos(angle) * force;
              array[i + 1] += Math.sin(angle) * force;
            }
          }
          
          positions.needsUpdate = true;
        }
      }
      
      controls.update();
      renderer.render(scene, camera);
      
      if (onFrameRecord) {
        const frameDuration = performance.now() - frameStart;
        onFrameRecord(frameDuration);
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    requestRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      
      if (particlesRef.current) {
        if (sceneRef.current) {
          sceneRef.current.remove(particlesRef.current);
        }
        
        if (particlesRef.current.geometry) {
          particlesRef.current.geometry.dispose();
        }
        
        if (particlesRef.current.material) {
          const material = particlesRef.current.material as THREE.Material;
          material.dispose();
        }
        
        particlesRef.current = null;
      }
    };
  }, [handleMouseMove, onFrameRecord, particleSize, quality?.renderScale, resolvedParticleCount, sceneRef, rendererRef, controlsRef, requestRef, particleSettings?.particleCount, particleSettings?.particleSize, particleSettings?.glowIntensity]);
  
  return (
    <div 
      ref={mountRef} 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default SimpleSparkles;