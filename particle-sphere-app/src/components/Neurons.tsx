import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import useThreeSetup from "../hooks/useThreeSetup";
import usePerformanceMonitor from "../hooks/usePerformanceMonitor";

// Create a circular texture with soft edges for better-looking particles
function createCircleTexture(size = 128): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return canvas;
  
  // Create a radial gradient for a soft-edged particle
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  
  // Softer center with lower opacity for less intense glow
  // Using white allows the vertex colors to show through correctly
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');  // Reduced from 1.0 to 0.8
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');  // Reduced opacity
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');  // Reduced opacity
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  // Draw the circle
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
}

// Helper to generate RGB colors with reduced brightness
function generateRainbowColor(index: number, total: number, time: number = 0): THREE.Color {
  // Distribute colors evenly across the spectrum with time-based offset
  const hue = (index / total + time * 0.1) % 1.0;
  
  // Use HSL for easy rainbow generation
  // Reduced saturation from 0.8 to 0.7 for less vibrant colors
  // Reduced lightness from 0.6 to 0.45 for dimmer appearance
  return new THREE.Color().setHSL(hue, 0.7, 0.45);
}

/**
 * Particle network visualization similar to Julian Laval's Canvas Particle Network
 */
const Neurons = ({ onFrameRecord }) => {
  const { mountRef, sceneRef, rendererRef, controlsRef, requestRef } = useThreeSetup();
  const clockRef = useRef<THREE.Clock | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const mousePositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const particlesRef = useRef<THREE.Points | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const linePositionsRef = useRef<Float32Array | null>(null);
  const lineColorsRef = useRef<Float32Array | null>(null);
  
  // Integrate performance monitoring
  const { metrics, quality, recordFrame } = usePerformanceMonitor({
    initialParticleCount: 150,
    targetFps: 55,
    adjustQuality: true,
    minParticleCount: 80,
    maxParticleCount: 300,
    particleCountStep: 20
  });

  // Configuration parameters
  const config = useMemo(() => ({
    // Particle settings
    particleCount: quality.particleCount,
    particleSize: 2.0,  // Reduced from 3.5 to 2.0 for smaller particles
    
    // Space settings
    areaWidth: 25,
    areaHeight: 15,
    areaDepth: 10, 
    
    // Connection settings
    connectionDistance: 5.5,         // Slightly reduced connection distance
    connectionOpacity: 0.3,         // Reduced from 0.5 to 0.3 for subtler connections
    connectionWidth: 0.8,          // Thinner lines
    
    // Color settings
    useRainbowColors: true,        // RGB effect
    colorCycleSpeed: 0.05,         // Speed of color cycling
    particleSaturation: 0.9,       // Color saturation (0-1)
    particleBrightness: 0.7,       // Brightness of particles (0-1)
    
    // Animation settings
    particleSpeed: 0.05,
    mouseInfluenceRadius: 5,
    mouseForce: 0.2
  }), [quality.particleCount]);

  // Mouse move handler - track mouse position for particle interaction
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Convert screen coordinates to normalized device coordinates (-1 to +1)
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Update the mouse position reference (z=0 plane)
      if (mousePositionRef.current) {
        mousePositionRef.current.set(
          mouseX * config.areaWidth / 2, 
          mouseY * config.areaHeight / 2, 
          0
        );
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [config.areaWidth, config.areaHeight]);

  // Main effect to set up and animate the particle network
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !controlsRef.current) return;
    
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = controlsRef.current.object as THREE.PerspectiveCamera;
    
    // Set camera position to view the area
    camera.position.set(0, 0, 30);
    camera.lookAt(0, 0, 0);
    
    // Create scene group
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);
    
    // Create clock for animations
    const clock = new THREE.Clock();
    clockRef.current = clock;
    
    // Particle geometry
    const particleGeometry = new THREE.BufferGeometry();
    
    // Create arrays for particle positions and velocities
    const positions = new Float32Array(config.particleCount * 3);
    const velocities = new Float32Array(config.particleCount * 3);
    const colors = new Float32Array(config.particleCount * 3);
    const indexArray = new Float32Array(config.particleCount); // Store index for color animation
    
    // Initialize particles in a rectangular prism
    for (let i = 0; i < config.particleCount; i++) {
      const i3 = i * 3;
      
      // Random position within boundaries
      positions[i3] = (Math.random() - 0.5) * config.areaWidth;
      positions[i3 + 1] = (Math.random() - 0.5) * config.areaHeight;
      positions[i3 + 2] = (Math.random() - 0.5) * config.areaDepth;
      
      // Random velocity for movement
      velocities[i3] = (Math.random() - 0.5) * 0.2;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
      
      // Store particle index for color animation
      indexArray[i] = i;
      
      // Apply RGB rainbow colors
      // Each particle gets a unique color in the rainbow spectrum
      const color = generateRainbowColor(i, config.particleCount);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    
    // Set geometry attributes
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('index', new THREE.BufferAttribute(indexArray, 1));
    
    // Create circle texture for particles
    const particleTexture = new THREE.CanvasTexture(createCircleTexture());
    
    // Create particle material with enhanced glow effect
    const particleMaterial = new THREE.PointsMaterial({
      size: config.particleSize,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,  // Disable fog for cleaner look
      sizeAttenuation: true  // Make particles smaller with distance
    });
    
    // Create particles
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particlesRef.current = particles;
    group.add(particles);
    
    // Lines for connections
    // Pre-allocate max possible connections (each particle could connect to others)
    // This is an optimization to avoid recreating the geometry each frame
    const maxConnections = config.particleCount * 10; // Reasonable limit per particle
    const linePositions = new Float32Array(maxConnections * 2 * 3); // 2 points per line * 3 coords
    const lineColors = new Float32Array(maxConnections * 2 * 3); // 2 points per line * 3 color values
    
    // Store references for updating in the animation loop
    linePositionsRef.current = linePositions;
    lineColorsRef.current = lineColors;
    
    // Create lines geometry
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    
    // Create line material (transparent and blended) with reduced intensity
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: config.connectionOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: config.connectionWidth // Apply the configured line width
    });
    
    // Create lines
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    linesRef.current = lines;
    group.add(lines);
    
    // Animation loop
    const animate = () => {
      const time = clock.getElapsedTime();
      
      // Get references to buffers
      const particlePositions = particleGeometry.attributes.position.array as Float32Array;
      
      // Update particle positions
      for (let i = 0; i < config.particleCount; i++) {
        const i3 = i * 3;
        
        // Move particles
        particlePositions[i3] += velocities[i3] * config.particleSpeed;
        particlePositions[i3 + 1] += velocities[i3 + 1] * config.particleSpeed;
        particlePositions[i3 + 2] += velocities[i3 + 2] * config.particleSpeed;
        
        // Apply mouse influence if within radius
        if (mousePositionRef.current) {
          const dx = mousePositionRef.current.x - particlePositions[i3];
          const dy = mousePositionRef.current.y - particlePositions[i3 + 1];
          const dz = mousePositionRef.current.z - particlePositions[i3 + 2];
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          if (distance < config.mouseInfluenceRadius) {
            const force = (config.mouseInfluenceRadius - distance) / config.mouseInfluenceRadius;
            // Push particles away from mouse
            particlePositions[i3] += dx * force * config.mouseForce * 0.01;
            particlePositions[i3 + 1] += dy * force * config.mouseForce * 0.01;
            particlePositions[i3 + 2] += dz * force * config.mouseForce * 0.01;
          }
        }
        
        // Boundary check - bounce off walls with slight damping
        if (Math.abs(particlePositions[i3]) > config.areaWidth / 2) {
          velocities[i3] *= -0.9;
          particlePositions[i3] = Math.sign(particlePositions[i3]) * config.areaWidth / 2;
        }
        
        if (Math.abs(particlePositions[i3 + 1]) > config.areaHeight / 2) {
          velocities[i3 + 1] *= -0.9;
          particlePositions[i3 + 1] = Math.sign(particlePositions[i3 + 1]) * config.areaHeight / 2;
        }
        
        if (Math.abs(particlePositions[i3 + 2]) > config.areaDepth / 2) {
          velocities[i3 + 2] *= -0.9;
          particlePositions[i3 + 2] = Math.sign(particlePositions[i3 + 2]) * config.areaDepth / 2;
        }
      }
      
      // Mark particle positions as needing update
      particleGeometry.attributes.position.needsUpdate = true;
      
      // Update particle colors if rainbow effect is enabled
      if (config.useRainbowColors) {
        const particleColors = particleGeometry.attributes.color.array as Float32Array;
        
        // Cycle through colors based on time
        for (let i = 0; i < config.particleCount; i++) {
          const i3 = i * 3;
          
          // Generate color based on index and time
          const color = generateRainbowColor(
            i, 
            config.particleCount, 
            time * config.colorCycleSpeed
          );
          
          // Update color in the buffer
          particleColors[i3] = color.r;
          particleColors[i3 + 1] = color.g;
          particleColors[i3 + 2] = color.b;
        }
        
        // Mark colors as needing update
        particleGeometry.attributes.color.needsUpdate = true;
      }
      
      // Calculate connections
      let connectionCount = 0;
      
      // Reset line count
      if (lines && lineGeometry.drawRange) {
        lineGeometry.setDrawRange(0, 0);
      }
      
      // Find connections between particles
      for (let i = 0; i < config.particleCount; i++) {
        const i3 = i * 3;
        const x1 = particlePositions[i3];
        const y1 = particlePositions[i3 + 1];
        const z1 = particlePositions[i3 + 2];
        
        // Only check a limited number of particles ahead to reduce overall connections
        // This creates a sparser, less overwhelming network
        const connectionsToCheck = Math.min(config.particleCount - i - 1, 15); // Check max 15 neighbors
        for (let k = 1; k <= connectionsToCheck; k++) {
          const j = i + k;
          const j3 = j * 3;
          const x2 = particlePositions[j3];
          const y2 = particlePositions[j3 + 1];
          const z2 = particlePositions[j3 + 2];
          
          // Calculate distance
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dz = z2 - z1;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          // If particles are close enough, create a connection
          if (dist < config.connectionDistance && connectionCount < maxConnections) {
            // Calculate connection opacity based on distance
            const opacity = 1 - (dist / config.connectionDistance);
            
            // Set positions for the line segment
            const conn6 = connectionCount * 6; // 2 points * 3 coordinates
            
            if (linePositionsRef.current && lineColorsRef.current) {
              // Set line positions
              linePositionsRef.current[conn6] = x1;
              linePositionsRef.current[conn6 + 1] = y1;
              linePositionsRef.current[conn6 + 2] = z1;
              linePositionsRef.current[conn6 + 3] = x2;
              linePositionsRef.current[conn6 + 4] = y2;
              linePositionsRef.current[conn6 + 5] = z2;
              
              // Set color for each vertex of the line based on particle colors
              // Mix the colors of the two connected particles with reduced intensity
              const intensity = opacity * 0.6 + 0.1; // Reduced from 0.8+0.2 to 0.6+0.1
              
              // Get colors from the particles being connected
              const color1 = new THREE.Color(
                colors[i3], colors[i3 + 1], colors[i3 + 2]
              );
              const color2 = new THREE.Color(
                colors[j3], colors[j3 + 1], colors[j3 + 2]
              );
              
              // First vertex color (from first particle)
              lineColorsRef.current[conn6] = color1.r * intensity;
              lineColorsRef.current[conn6 + 1] = color1.g * intensity;
              lineColorsRef.current[conn6 + 2] = color1.b * intensity;
              
              // Second vertex color (from second particle)
              lineColorsRef.current[conn6 + 3] = color2.r * intensity;
              lineColorsRef.current[conn6 + 4] = color2.g * intensity;
              lineColorsRef.current[conn6 + 5] = color2.b * intensity;
            }
            
            connectionCount++;
          }
        }
      }
      
      // Update line count
      if (lineGeometry && lines) {
        lineGeometry.setDrawRange(0, connectionCount * 2); // 2 vertices per connection
        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.attributes.color.needsUpdate = true;
      }
      
      // Render
      renderer.render(scene, camera);
      
      // Record performance
      if (onFrameRecord) {
        const frameDuration = performance.now() - time * 1000;
        onFrameRecord(frameDuration);
        recordFrame(frameDuration);
      }
      
      // Schedule next frame
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    clock.start();
    requestRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      
      if (clockRef.current) {
        clockRef.current.stop();
      }
      
      // Clean up all resources
      particleGeometry.dispose();
      particleMaterial.dispose();
      
      if (particleMaterial.map) {
        particleMaterial.map.dispose();
      }
      
      if (lineGeometry) {
        lineGeometry.dispose();
      }
      
      if (lineMaterial) {
        lineMaterial.dispose();
      }
      
      // Clean up references
      particlesRef.current = null;
      linesRef.current = null;
      linePositionsRef.current = null;
      lineColorsRef.current = null;
      
      // Remove from scene
      if (groupRef.current && scene) {
        while (groupRef.current.children.length > 0) {
          const child = groupRef.current.children[0];
          groupRef.current.remove(child);
        }
        scene.remove(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [
    config.particleCount, config.particleSize, config.areaWidth, config.areaHeight, 
    config.areaDepth, config.connectionDistance, config.connectionOpacity, 
    config.mouseInfluenceRadius, config.mouseForce, config.particleSpeed,
    config.connectionColor, sceneRef, rendererRef, controlsRef, requestRef, 
    onFrameRecord, recordFrame
  ]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default Neurons;