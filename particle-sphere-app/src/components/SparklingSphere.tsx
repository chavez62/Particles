import React, { useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import useThreeSetup from "../hooks/useThreeSetup";

// Vertex shader for GPU-accelerated particle movement
const vertexShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec3 uMousePosition;
  uniform float uInteractionRadius;
  uniform float uDispersalForce;
  uniform float uReturnForce;
  uniform float uDampingFactor;
  uniform float uMaxGlowIntensity;
  uniform float uBaseGlowIntensity;

  // Per-instance attributes - using aColor instead of color to avoid conflicts
  attribute vec3 aOriginalPosition;
  attribute vec3 aVelocity;
  attribute vec3 aColor;
  
  // Varying outputs to fragment shader
  varying vec3 vColor;
  varying float vIntensity;
  
  void main() {
    // Get position directly from position attribute (not instanceMatrix)
    vec3 currentPosition = position;
    
    // Extract current velocity
    vec3 velocity = aVelocity;
    
    // Calculate distance to mouse
    float distanceToMouse = distance(currentPosition, uMousePosition);
    float isInRange = step(distanceToMouse, uInteractionRadius);
    
    // Calculate repulsion force if in range
    if (isInRange > 0.5) {
      vec3 repulsionDir = normalize(currentPosition - uMousePosition);
      float force = uDispersalForce * (1.0 - distanceToMouse / uInteractionRadius);
      
      // Add some randomness with a simple hash
      float randomFactor = fract(sin(dot(currentPosition, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      force *= (1.0 + randomFactor * 0.2);
      
      velocity += repulsionDir * force;
    }
    
    // Calculate return force to original position
    vec3 originalPos = aOriginalPosition;
    float distanceToOrigin = distance(currentPosition, originalPos);
    vec3 returnForceVector = normalize(originalPos - currentPosition) * (uReturnForce * distanceToOrigin);
    
    // Apply forces
    velocity += returnForceVector;
    velocity *= uDampingFactor;
    
    // Calculate new position
    vec3 newPosition = currentPosition + velocity;
    
    // Calculate glow intensity based on mouse proximity
    float intensity = mix(
      uMaxGlowIntensity,
      uBaseGlowIntensity,
      smoothstep(0.0, uInteractionRadius, distanceToMouse)
    );
    
    // Pass color and intensity to fragment shader - using aColor instead of aBaseColor
    vColor = aColor;
    vIntensity = intensity;
    
    // Transform the vertex position with model-view-projection matrix
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Point size with distance attenuation
    gl_PointSize = 4.0 * (1.0 / -mvPosition.z);
  }
`;

// Fragment shader
const fragmentShader = `
  varying vec3 vColor;
  varying float vIntensity;
  
  void main() {
    // Calculate distance from center of point sprite
    vec2 coords = gl_PointCoord - vec2(0.5);
    float dist = length(coords);
    
    // Discard fragments outside the circle
    if (dist > 0.5) discard;
    
    // Smooth edge
    float alpha = smoothstep(0.5, 0.2, dist);
    
    // Output glowing color with intensity
    gl_FragColor = vec4(vColor * vIntensity, alpha);
  }
`;

// Enhanced version using spatial partitioning for optimization
class ParticleSystem {
  mesh: THREE.Points;
  originalPositions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  material: THREE.ShaderMaterial;
  
  constructor(count: number, radius: number) {
    // Create geometry with per-instance attributes
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.originalPositions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    
    // Pre-defined colors
    const colorPalette = [
      new THREE.Color(0x88ccff),
      new THREE.Color(0x7dabf1),
      new THREE.Color(0x6a8dff)
    ];
    
    // Initialize particles on sphere surface
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Use spherical coordinates for even distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.pow(Math.random(), 1/3); // For volumetric distribution
      
      // Convert to Cartesian coordinates
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      // Set position
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      // Store original position
      this.originalPositions[i3] = x;
      this.originalPositions[i3 + 1] = y;
      this.originalPositions[i3 + 2] = z;
      
      // Initialize velocity to zero
      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;
      
      // Assign random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }
    
    // Add attributes to geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOriginalPosition', new THREE.BufferAttribute(this.originalPositions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3)); // Changed from aBaseColor to aColor
    
    // Create shader material with uniforms - reduced glow values
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMousePosition: { value: new THREE.Vector3(0, 0, 10) }, // Start out of range
        uInteractionRadius: { value: 1.5 },
        uDispersalForce: { value: 0.08 },
        uReturnForce: { value: 0.02 },
        uDampingFactor: { value: 0.95 },
        uMaxGlowIntensity: { value: 1.5 }, // Significantly reduced from 5.0 to prevent white screen
        uBaseGlowIntensity: { value: 0.25 } // Reduced from 0.5
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Create point cloud
    this.mesh = new THREE.Points(geometry, this.material);
  }
  
  update(time: number, mousePosition: THREE.Vector3) {
    // Update uniforms - much more efficient than updating each particle
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uMousePosition.value.copy(mousePosition);
  }
  
  dispose() {
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}

const SparklingSphereContent: React.FC<{ onFrameRecord?: (duration?: number) => void }> = ({ onFrameRecord }) => {
  // Use the shared Three.js setup hook
  const { mountRef, sceneRef, rendererRef, controlsRef, requestRef } = useThreeSetup();
  
  // Create custom references
  const composerRef = useRef<EffectComposer | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const planeRef = useRef<THREE.Plane | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  
  // Mouse tracking
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const mousePos3DRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 10)); // Start out of range
  
  // Interactive parameters - memoized to avoid recreating
  const params = useMemo(() => ({
    count: 3000, // Reduced for better performance
    radius: 2,
    interactionRadius: 1.5,
    maxGlowIntensity: 3, // Reduced for better performance
    baseGlowIntensity: 0.3, // Reduced for better performance
    dispersalForce: 0.05, // Reduced for better calculations
    returnForce: 0.01, // Reduced for fewer calculations
    dampingFactor: 0.95,
    rotationSpeed: 0.002
  }), []);
  
  // Mouse move handler
  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Update normalized device coordinates
    mousePosRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }, []);
  
  // Main effect for setup and animation
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !controlsRef.current) return;
    
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = controlsRef.current.object as THREE.PerspectiveCamera;
    
    // Post-processing setup
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Minimal bloom to prevent white screen over time
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth / 4, window.innerHeight / 4), // Even lower resolution for better performance
      0.25, // Reduced bloom strength further
      0.15, // Tighter bloom
      0.45  // Higher threshold to reduce bloom effect and improve performance
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;
    
    // Create a raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    
    // Store in refs for cleanup
    raycasterRef.current = raycaster;
    planeRef.current = intersectPlane;
    
    // Create particle system with GPU-accelerated shader
    const particleSystem = new ParticleSystem(params.count, params.radius);
    scene.add(particleSystem.mesh);
    particleSystemRef.current = particleSystem;
    
    // Create a group for rotation
    const group = new THREE.Group();
    group.add(particleSystem.mesh);
    scene.add(group);
    
    // Store group reference for cleanup
    groupRef.current = group;
    
    // Initialize clock
    const clock = new THREE.Clock();
    clockRef.current = clock;
    
    // Animation loop with performance optimizations
    const animate = () => {
      const startTime = window.performance.now();
      
      if (!particleSystemRef.current || !composerRef.current || !clockRef.current) return;
      
      // Update controls less frequently for better performance
      // Only update every other frame
      if (controlsRef.current && Math.floor(startTime) % 2 === 0) {
        controlsRef.current.update();
      }
      
      // Update mouse position in 3D space using raycaster
      if (raycasterRef.current && planeRef.current) {
        raycasterRef.current.setFromCamera(mousePosRef.current, camera);
        const intersectPoint = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectPoint)) {
          mousePos3DRef.current.copy(intersectPoint);
        }
      }
      
      // Get elapsed time once to avoid multiple calls
      const elapsedTime = clockRef.current.getElapsedTime();
      
      // Update particle system (this updates the shader uniforms)
      particleSystemRef.current.update(
        elapsedTime, 
        mousePos3DRef.current
      );
      
      // Rotate the entire group
      if (groupRef.current) {
        groupRef.current.rotation.y += params.rotationSpeed;
      }
      
      // Render using composer for post-processing
      composerRef.current.render();
      
      // Calculate frame duration and record it for performance monitoring
      // Only record every 3rd frame to reduce overhead
      if (onFrameRecord && Math.floor(startTime) % 3 === 0) {
        const frameDuration = window.performance.now() - startTime;
        onFrameRecord(frameDuration);
      }
      
      // Request next frame
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Add mouse move listener
    window.addEventListener("mousemove", handleMouseMove);
    
    // Start animation
    clockRef.current.start();
    requestRef.current = requestAnimationFrame(animate);
    
    // Comprehensive cleanup
    return () => {
      // Remove event listeners
      window.removeEventListener("mousemove", handleMouseMove);
      
      // Stop animation frame if running
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      
      // Stop clock
      if (clockRef.current) {
        clockRef.current.stop();
      }
      
      // Dispose particle system
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
        particleSystemRef.current = null;
      }
      
      // Remove group from scene and dispose it
      if (groupRef.current && sceneRef.current) {
        sceneRef.current.remove(groupRef.current);
        
        if (groupRef.current.children.length > 0) {
          for (let i = groupRef.current.children.length - 1; i >= 0; i--) {
            const child = groupRef.current.children[i];
            groupRef.current.remove(child);
          }
        }
        groupRef.current = null;
      }
      
      // Dispose all passes in the composer
      if (composerRef.current) {
        composerRef.current.passes.forEach(pass => {
          if ('dispose' in pass && typeof pass.dispose === 'function') {
            pass.dispose();
          }
        });
        composerRef.current = null;
      }
      
      // Clear raycaster and other resources
      raycasterRef.current = null;
      planeRef.current = null;
      
      // Clear references
      mousePosRef.current.set(0, 0);
      mousePos3DRef.current.set(0, 0, 10);
    };
  }, [params, handleMouseMove, sceneRef, rendererRef, controlsRef, requestRef, onFrameRecord]);
  
  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
};

const SparklingSphere: React.FC<{ onFrameRecord?: (duration?: number) => void }> = ({ onFrameRecord }) => (
  <WebGLErrorBoundary>
    <SparklingSphereContent onFrameRecord={onFrameRecord} />
  </WebGLErrorBoundary>
);

export default SparklingSphere;