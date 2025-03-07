import { useEffect, useRef, MutableRefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGLContextManager from '../utils/WebGLContextManager';

export interface ThreeSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  mount: HTMLDivElement;
}

interface UseThreeSetupResult {
  mountRef: MutableRefObject<HTMLDivElement | null>;
  sceneRef: MutableRefObject<THREE.Scene | null>;
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  requestRef: MutableRefObject<number | undefined>;
  setup: ThreeSetup | null;
}

const useThreeSetup = (onSetup?: (setup: ThreeSetup) => void): UseThreeSetupResult => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const requestRef = useRef<number>();
  const setupRef = useRef<ThreeSetup | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const contextManager = WebGLContextManager.getInstance();
    const renderer = contextManager.getRenderer();
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const camera = new THREE.PerspectiveCamera(
      75,
      sizes.width / sizes.height,
      0.1,
      1000
    );
    camera.position.set(5, 5, 8);
    scene.add(camera);

    renderer.setSize(sizes.width, sizes.height);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.5; // Slower zoom for smoother performance
    controls.autoRotate = false; // Disable auto rotation
    controls.rotateSpeed = 0.5; // Reduced rotation speed
    controls.enablePan = false; // Disable panning for better performance
    controlsRef.current = controls;

    setupRef.current = {
      scene,
      camera,
      renderer,
      controls,
      mount: mountRef.current
    };

    if (onSetup) {
      onSetup(setupRef.current);
    }

    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      contextManager.resizeRenderer(sizes.width, sizes.height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      if (sceneRef.current) {
        // Comprehensive cleanup of all objects in the scene
        sceneRef.current.traverse((object) => {
          // Remove event listeners from objects if they exist
          if (object.userData && object.userData.eventListeners) {
            for (const [eventName, callback] of Object.entries(object.userData.eventListeners)) {
              object.removeEventListener(eventName, callback as EventListener);
            }
          }
          
          // Dispose geometries and materials for all THREE object types
          if (object instanceof THREE.Mesh || 
              object instanceof THREE.Points || 
              object instanceof THREE.Line) {
            if (object.geometry) {
              object.geometry.dispose();
            }
            
            // Handle both single materials and material arrays
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => {
                  if (material.map) material.map.dispose();
                  if (material.lightMap) material.lightMap.dispose();
                  if (material.bumpMap) material.bumpMap.dispose();
                  if (material.normalMap) material.normalMap.dispose();
                  if (material.specularMap) material.specularMap.dispose();
                  if (material.envMap) material.envMap.dispose();
                  material.dispose();
                });
              } else {
                const material = object.material as THREE.Material;
                if ('map' in material && material.map) material.map.dispose();
                if ('lightMap' in material && material.lightMap) material.lightMap.dispose();
                if ('bumpMap' in material && material.bumpMap) material.bumpMap.dispose();
                if ('normalMap' in material && material.normalMap) material.normalMap.dispose();
                if ('specularMap' in material && material.specularMap) material.specularMap.dispose();
                if ('envMap' in material && material.envMap) material.envMap.dispose();
                material.dispose();
              }
            }
          }
        });
        
        // Clear all remaining objects from scene
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
      }

      contextManager.releaseRenderer();

      // Clear references
      sceneRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      setupRef.current = null;
    };
  }, [onSetup]);

  return {
    mountRef,
    sceneRef,
    rendererRef,
    controlsRef,
    requestRef,
    setup: setupRef.current
  };
};

export default useThreeSetup;