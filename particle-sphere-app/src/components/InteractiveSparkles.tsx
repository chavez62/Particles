import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import useThreeSetup, { ThreeSetup } from '../hooks/useThreeSetup';

interface InteractiveSparklesProps {
  quality: {
    particleCount: number;
    particleSize: number;
    complexity: number;
  };
  onFrameRecord?: (duration?: number) => void;
}

const InteractiveSparkles: React.FC<InteractiveSparklesProps> = ({ quality, onFrameRecord }) => {
  // Pass an empty setup callback to ensure setup is initialized properly
  const { mountRef, sceneRef, rendererRef, controlsRef, requestRef, setup } = useThreeSetup(() => {
    console.log('InteractiveSparkles: useThreeSetup callback executed');
  });
  const particlesRef = useRef<THREE.Points | null>(null);
  const timeRef = useRef(0);
  const mousePositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const [isHovering, setIsHovering] = useState(false);

  // Handle mouse move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    mousePositionRef.current.set(x * 5, y * 5, 0);
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  // Setup scene
  useEffect(() => {
    console.log('InteractiveSparkles: Setup effect starting');
    
    if (!setup) {
      console.error('InteractiveSparkles: Setup is not available');
      return;
    }
    
    console.log('InteractiveSparkles: Setting up with', quality.particleCount, 'particles');
    
    const { scene, camera } = setup;
    
    // Create basic sphere geometry
    const geometry = new THREE.BufferGeometry();
    const particleCount = quality.particleCount;
    
    // Positions array for particles
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // Create particles in sphere shape
    const radius = 5;
    for (let i = 0; i < particleCount; i++) {
      // Random position using spherical coordinates
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Blue-teal color scheme
      colors[i * 3] = 0.1 + Math.random() * 0.3; // r
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.3; // g
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.3; // b
      
      // Random size
      sizes[i] = Math.random() * quality.particleSize;
    }
    
    // Set attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create point cloud material
    const material = new THREE.PointsMaterial({
      size: quality.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    // Create points object
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;
    
    // Set camera position
    camera.position.set(0, 0, 15);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add mouse move listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    console.log('InteractiveSparkles: Setup complete');
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      
      if (particles) {
        scene.remove(particles);
        geometry.dispose();
        material.dispose();
      }
    };
  }, [setup, quality, handleMouseMove, handleMouseLeave]);
  
  // Animation loop
  useEffect(() => {
    if (!setup || !particlesRef.current) {
      console.error('InteractiveSparkles: Animation loop - Setup or particles not available');
      return;
    }
    
    console.log('InteractiveSparkles: Starting animation loop');
    
    const { scene, camera, renderer, controls } = setup;
    const particles = particlesRef.current;
    
    // Animation function
    const animate = () => {
      const startTime = performance.now();
      
      if (particles) {
        // Update time
        timeRef.current += 0.01;
        
        // Simple animation - rotate the particle system
        particles.rotation.y += 0.002;
        
        // If mouse is hovering, create a ripple effect
        if (isHovering) {
          const positions = particles.geometry.attributes.position.array as Float32Array;
          const originalPositions = [...positions]; // Make a copy of current positions
          
          for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Calculate distance to mouse position
            const dx = x - mousePositionRef.current.x;
            const dy = y - mousePositionRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Apply a sine wave effect based on distance
            if (distance < 4) {
              const factor = 1 - distance / 4;
              const amplitude = 0.2 * factor;
              const frequency = 5;
              const wave = Math.sin(timeRef.current * frequency + distance * 2) * amplitude;
              
              // Move particles away from mouse
              const angle = Math.atan2(dy, dx);
              positions[i] = originalPositions[i] + Math.cos(angle) * wave;
              positions[i + 1] = originalPositions[i + 1] + Math.sin(angle) * wave;
              positions[i + 2] = originalPositions[i + 2] + wave * 0.5;
            }
          }
          
          // Update the positions
          particles.geometry.attributes.position.needsUpdate = true;
        }
      }
      
      // Update controls
      controls.update();
      
      // Render scene
      renderer.render(scene, camera);
      
      // Record frame duration
      const frameDuration = performance.now() - startTime;
      if (onFrameRecord) {
        onFrameRecord(frameDuration);
      }
      
      // Continue animation loop
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [setup, isHovering, onFrameRecord]);
  
  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
};

// For lazy loading in React, we need to use the default export pattern
const InteractiveSparklesExport = () => {
  return (
    <InteractiveSparkles 
      quality={{ 
        particleCount: 3000, 
        particleSize: 0.5, 
        complexity: 1
      }}
    />
  );
};

export default InteractiveSparklesExport;