import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import useThreeSetup from "../hooks/useThreeSetup";
import type { QualitySettings } from "../hooks/usePerformanceMonitor";

interface ParticleSettings {
  particleCount: number;
  particleSize: number;
  speed: number;
  glowIntensity: number;
  rotationSpeed: number;
}

interface ParticleSphereProps {
  quality?: QualitySettings;
  onFrameRecord?: (duration?: number) => void;
  particleSettings?: ParticleSettings;
}

// Vertex shader - handles the wave animation
const vertexShader = `
  uniform float uTime;
  uniform float uRadius;
  
  // Use position attribute from THREE.js
  attribute vec3 aInitialPosition;
  
  // Output variable for fragment shader
  varying vec3 vColor;
  
  void main() {
    // Get normalized direction from center
    vec3 normalizedPos = normalize(aInitialPosition);
    
    // Calculate length (distance from center)
    float distFromCenter = length(aInitialPosition);
    
    // Create a wave effect based on time and distance
    float wave = sin(uTime * 0.5 + distFromCenter * 2.0) * 0.1;
    
    // Apply wave to position
    vec3 newPosition = normalizedPos * (uRadius + wave);
    
    // Calculate color phase based on time
    float colorPhase = uTime * 0.25;
    
    // Create a pulsing color effect
    vec3 pulsingColor = vec3(
      sin(distFromCenter + colorPhase) * 0.5 + 0.5,
      sin(distFromCenter + colorPhase + 2.0) * 0.5 + 0.5,
      sin(distFromCenter + colorPhase + 4.0) * 0.5 + 0.5
    );
    
    // Pass final color to fragment shader
    vColor = pulsingColor;
    
    // Set the vertex position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    
    // Point size attenuation (can be modified by settings)
    gl_PointSize = 2.0;
  }
`;

// Fragment shader - renders each particle
const fragmentShader = `
  varying vec3 vColor;
  
  void main() {
    // Calculate distance from center of point
    float dist = length(gl_PointCoord - vec2(0.5));
    
    // Discard pixels outside the circle
    if (dist > 0.5) discard;
    
    // Apply smooth edge
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    
    // Set fragment color
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const ParticleSphere: React.FC<ParticleSphereProps> = ({ onFrameRecord, quality, particleSettings }) => {
  const { mountRef, sceneRef, rendererRef, controlsRef, requestRef } = useThreeSetup();
  
  // Use refs for dynamic settings that shouldn't cause scene rebuild
  const speedRef = useRef(particleSettings?.speed ?? 1);
  const rotationSpeedRef = useRef(particleSettings?.rotationSpeed ?? 1);
  
  // Update refs when settings change
  useEffect(() => {
    speedRef.current = particleSettings?.speed ?? 1;
    rotationSpeedRef.current = particleSettings?.rotationSpeed ?? 1;
  }, [particleSettings?.speed, particleSettings?.rotationSpeed]);
  
  // Use particle settings or quality settings for particle count
  const particleCount = useMemo(() => {
    if (particleSettings?.particleCount) {
      return Math.floor(particleSettings.particleCount);
    }
    return quality?.particleCount || 3000;
  }, [quality, particleSettings?.particleCount]);
  
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !controlsRef.current) return;
    
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current;
    
    // Create a clock for time-based animations
    const clock = new THREE.Clock();
    clock.start();
    
    // Set radius based on quality if available
    const radius = 5;
    
    // Create geometry once
    const geometry = new THREE.BufferGeometry();
    
    // Original positions array - we'll keep this for reference in the shader
    const positions = new Float32Array(particleCount * 3);
    
    // Initialize particles in a sphere with even distribution
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Use spherical coordinates for even distribution
      const theta = Math.random() * Math.PI * 2; // azimuthal angle
      const phi = Math.acos(2 * Math.random() - 1); // polar angle
      const r = radius * Math.pow(Math.random(), 1/3); // For volumetric distribution
      
      // Convert to Cartesian coordinates
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
    }
    
    // Set geometry attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create a separate buffer for initial positions to avoid memory leak
    const initialPositionsBuffer = new THREE.BufferAttribute(positions.slice(), 3);
    geometry.setAttribute('aInitialPosition', initialPositionsBuffer);
    
    // Create shader material with regular blending to prevent white screen over time
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: radius }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthTest: false
    });
    
    // Create particle system
    const particles = new THREE.Points(geometry, shaderMaterial);
    scene.add(particles);
    
    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !controlsRef.current) {
        return; // Exit if component is unmounting
      }
      
      const startTime = window.performance.now();
      
      // Update uniforms for shader (with speed multiplier from ref)
      shaderMaterial.uniforms.uTime.value = clock.getElapsedTime() * speedRef.current;
      
      // Rotate the whole system (much more efficient than updating each particle)
      particles.rotation.y += 0.002 * rotationSpeedRef.current;
      
      controls.update();
      
      // Get the camera from controls
      const camera = controls.object;
      renderer.render(scene, camera);
      
      // Calculate frame duration and record it for performance monitoring
      const endTime = window.performance.now();
      const frameDuration = endTime - startTime;
      if (onFrameRecord) {
        onFrameRecord(frameDuration);
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    requestRef.current = requestAnimationFrame(animate);
    
    // Comprehensive cleanup
    return () => {
      // Stop animation loop
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      
      // Stop clock
      clock.stop();
      
      // Remove particles from scene
      if (particles && scene) {
        scene.remove(particles);
      }
      
      // Dispose of all buffers and attributes
      if (geometry) {
        geometry.dispose();
      }
      
      if (shaderMaterial) {
        shaderMaterial.dispose();
      }
      
      // Explicitly dispose of buffer attributes
      if (initialPositionsBuffer) {
        initialPositionsBuffer.array = null;
      }
    };
  }, [particleCount, requestRef, sceneRef, rendererRef, controlsRef, onFrameRecord]);
  
  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
};

export default ParticleSphere;