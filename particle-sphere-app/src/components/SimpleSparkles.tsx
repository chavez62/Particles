import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const SimpleSparkles: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  
  // Handle mouse move
  const handleMouseMove = (event: MouseEvent) => {
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };
  
  // Setup scene
  useEffect(() => {
    console.log('SimpleSparkles: Setting up scene');
    
    if (!mountRef.current) {
      console.error('SimpleSparkles: Mount ref is not available');
      return;
    }
    
    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Create particles
    const particleCount = 3000;
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
    
    // Create material
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
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
      if (
        controlsRef.current && 
        rendererRef.current && 
        sceneRef.current && 
        cameraRef.current &&
        particlesRef.current
      ) {
        // Update controls
        controlsRef.current.update();
        
        // Rotate particles
        particlesRef.current.rotation.y += 0.002;
        
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
            
            // Apply small repulsion effect
            if (dist < 3) {
              const angle = Math.atan2(dy, dx);
              const force = 0.05 * (1 - dist / 3);
              array[i] += Math.cos(angle) * force;
              array[i + 1] += Math.sin(angle) * force;
            }
          }
          
          positions.needsUpdate = true;
        }
        
        // Render
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      frameIdRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      console.log('SimpleSparkles: Cleaning up');
      
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
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
      }
      
      if (rendererRef.current) {
        if (mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      // Clear refs
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      particlesRef.current = null;
      controlsRef.current = null;
      frameIdRef.current = null;
    };
  }, []);
  
  return (
    <div 
      ref={mountRef} 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default SimpleSparkles;