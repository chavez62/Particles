import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import useThreeSetup from "../hooks/useThreeSetup";
import useVisibilityDetection from "../hooks/useVisibilityDetection";
import type { QualitySettings } from "../hooks/usePerformanceMonitor";

const PARTICLE_TEXTURE_SIZE = 128;
const TEMP_COLOR = new THREE.Color();
const SECOND_COLOR = new THREE.Color();
const TEMP_VECTOR = new THREE.Vector3();

const createCircleTexture = (size = PARTICLE_TEXTURE_SIZE): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return canvas;
  }

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
  gradient.addColorStop(0.35, "rgba(255, 255, 255, 0.32)");
  gradient.addColorStop(0.65, "rgba(255, 255, 255, 0.08)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
};

interface NeuronConfig {
  particleCount: number;
  area: { width: number; height: number; depth: number };
  particleSize: number;
  particleOpacity: number;
  particleSpeed: number;
  velocityDamping: number;
  noiseStrength: number;
  noiseFrequency: number;
  pointerForce: number;
  pointerRadius: number;
  connectionDistance: number;
  maxConnectionsPerParticle: number;
  neighbourScanLimit: number;
  maxSegments: number;
  lineBaseOpacity: number;
  lineHighlightOpacity: number;
  lineColorBoost: number;
  linePulseSpeed: number;
  renderScale: number;
  toneMappingExposure: number;
  backgroundColor: string;
  fogDensity: number;
  particleTextureSize: number;
  effectsFactor: number;
}

const buildConfig = (quality?: QualitySettings, particleSettings?: any): NeuronConfig => {
  const effectsLevel = THREE.MathUtils.clamp(quality?.effectsLevel ?? 1, 0, 2);
  const factor = effectsLevel / 2;
  const baseParticleCount = Math.max(80, Math.round(quality?.particleCount ?? 180));
  const particleCount = particleSettings?.particleCount ? Math.floor(particleSettings.particleCount) : baseParticleCount;
  
  // Get settings multipliers (speed is NOT included here - handled via ref)
  const sizeMultiplier = particleSettings?.particleSize ?? 2;
  const glowMultiplier = particleSettings?.glowIntensity ?? 1;

  return {
    particleCount,
    area: {
      width: THREE.MathUtils.lerp(22, 32, factor),
      height: THREE.MathUtils.lerp(14, 22, factor),
      depth: THREE.MathUtils.lerp(10, 16, factor)
    },
    particleSize: THREE.MathUtils.lerp(1.35, 2.35, factor) * (sizeMultiplier / 2),
    particleOpacity: Math.min(THREE.MathUtils.lerp(0.45, 0.78, factor) * glowMultiplier, 1),
    particleSpeed: THREE.MathUtils.lerp(14, 24, factor), // Speed multiplier applied in animation loop
    velocityDamping: 0.86,
    noiseStrength: THREE.MathUtils.lerp(0.55, 1.3, factor),
    noiseFrequency: THREE.MathUtils.lerp(0.55, 0.95, factor),
    pointerForce: THREE.MathUtils.lerp(22, 34, factor),
    pointerRadius: THREE.MathUtils.lerp(4, 6.2, factor),
    connectionDistance: THREE.MathUtils.lerp(4.4, 6.4, factor),
    maxConnectionsPerParticle: Math.round(THREE.MathUtils.lerp(2.2, 4.8, factor)),
    neighbourScanLimit: Math.round(THREE.MathUtils.lerp(18, 34, factor)),
    maxSegments: Math.round(particleCount * THREE.MathUtils.lerp(1.6, 2.6, factor)),
    lineBaseOpacity: Math.min(THREE.MathUtils.lerp(0.08, 0.15, factor) * glowMultiplier, 1),
    lineHighlightOpacity: Math.min(THREE.MathUtils.lerp(0.19, 0.32, factor) * glowMultiplier, 1),
    lineColorBoost: THREE.MathUtils.lerp(0.5, 0.8, factor) * glowMultiplier,
    linePulseSpeed: THREE.MathUtils.lerp(0.32, 0.58, factor), // Speed multiplier applied in animation loop
    renderScale: quality?.renderScale ?? 1,
    toneMappingExposure: THREE.MathUtils.lerp(0.65, 0.82, factor),
    backgroundColor: "#050a16",
    fogDensity: THREE.MathUtils.lerp(0.042, 0.028, factor),
    particleTextureSize: PARTICLE_TEXTURE_SIZE,
    effectsFactor: factor
  };
};

interface ParticleSettings {
  particleCount: number;
  particleSize: number;
  speed: number;
  glowIntensity: number;
  rotationSpeed: number;
}

interface NeuronsProps {
  onFrameRecord?: (duration?: number) => void;
  quality?: QualitySettings;
  particleSettings?: ParticleSettings;
}

const Neurons: React.FC<NeuronsProps> = ({ onFrameRecord, quality, particleSettings }) => {
  // Use refs for dynamic settings that shouldn't cause scene rebuild
  const speedMultiplierRef = useRef(particleSettings?.speed ?? 1);
  
  // Update speed ref when settings change (no rebuild)
  useEffect(() => {
    speedMultiplierRef.current = particleSettings?.speed ?? 1;
  }, [particleSettings?.speed]);
  
  const config = useMemo(
    () => buildConfig(quality, particleSettings),
    [quality, quality?.particleCount, quality?.effectsLevel, quality?.renderScale, particleSettings?.particleCount, particleSettings?.particleSize, particleSettings?.glowIntensity]
  );

  const { mountRef, sceneRef, rendererRef, controlsRef, requestRef } = useThreeSetup();
  const isVisible = useVisibilityDetection();

  const pointerNormRef = useRef(new THREE.Vector2());
  const pointerStrengthRef = useRef(0);
  const pointerWorldRef = useRef(new THREE.Vector3());
  const pointerTargetRef = useRef(new THREE.Vector3());

  const particlePositionsRef = useRef<Float32Array>();
  const particleVelocitiesRef = useRef<Float32Array>();
  const particleColorsRef = useRef<Float32Array>();
  const linePositionsRef = useRef<Float32Array>();
  const lineColorsRef = useRef<Float32Array>();

  const particleGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const particleMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const lineGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lineMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const spatialHashRef = useRef<{ cellSize: number; grid: Map<string, number[]> }>({
    cellSize: config.connectionDistance,
    grid: new Map()
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointerNormRef.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      pointerStrengthRef.current = 1;
    };

    const handlePointerLeave = () => {
      pointerStrengthRef.current = 0;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current) {
      return;
    }

    rendererRef.current.setPixelRatio(window.devicePixelRatio * config.renderScale);
  }, [config.renderScale, rendererRef]);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !controlsRef.current) {
      return;
    }

    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current;
    const clock = clockRef.current;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = config.toneMappingExposure;
    renderer.setClearColor(config.backgroundColor, 1);

    scene.background = new THREE.Color(config.backgroundColor);
    scene.fog = new THREE.FogExp2(config.backgroundColor, config.fogDensity);

    const camera = controls.object as THREE.PerspectiveCamera;
    camera.position.set(0, 0, 28);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    group.name = "neurons-network";
    scene.add(group);
    groupRef.current = group;

    const ambient = new THREE.AmbientLight(0xffffff, 0.25 + config.effectsFactor * 0.25);
    const rim = new THREE.DirectionalLight(0x6ec8ff, 0.35 + config.effectsFactor * 0.25);
    rim.position.set(-4, 6, 6);
    group.add(ambient, rim);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.particleCount * 3);
    const velocities = new Float32Array(config.particleCount * 3);
    const colors = new Float32Array(config.particleCount * 3);

    const halfWidth = config.area.width / 2;
    const halfHeight = config.area.height / 2;
    const halfDepth = config.area.depth / 2;

    for (let i = 0; i < config.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = THREE.MathUtils.randFloatSpread(config.area.width);
      positions[i3 + 1] = THREE.MathUtils.randFloatSpread(config.area.height);
      positions[i3 + 2] = THREE.MathUtils.randFloatSpread(config.area.depth);

      velocities[i3] = THREE.MathUtils.randFloatSpread(0.6);
      velocities[i3 + 1] = THREE.MathUtils.randFloatSpread(0.6);
      velocities[i3 + 2] = THREE.MathUtils.randFloatSpread(0.6);

      TEMP_COLOR.setHSL((i / config.particleCount) % 1, 0.45, 0.55);
      colors[i3] = TEMP_COLOR.r;
      colors[i3 + 1] = TEMP_COLOR.g;
      colors[i3 + 2] = TEMP_COLOR.b;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const texture = new THREE.CanvasTexture(createCircleTexture(config.particleTextureSize));
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy() ?? 1;
    textureRef.current = texture;

    const particleMaterial = new THREE.PointsMaterial({
      map: texture,
      size: config.particleSize,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      opacity: config.particleOpacity
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(config.maxSegments * 6);
    const lineColors = new Float32Array(config.maxSegments * 6);
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: config.lineBaseOpacity
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    particleGeometryRef.current = particleGeometry;
    particleMaterialRef.current = particleMaterial;
    particlePositionsRef.current = positions;
    particleVelocitiesRef.current = velocities;
    particleColorsRef.current = colors;
    lineGeometryRef.current = lineGeometry;
    lineMaterialRef.current = lineMaterial;
    linePositionsRef.current = linePositions;
    lineColorsRef.current = lineColors;

    spatialHashRef.current.cellSize = config.connectionDistance;

    const pointerRadiusSq = config.pointerRadius * config.pointerRadius;

    const animate = () => {
      // Skip animation if tab is hidden
      if (!isVisible) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const frameStart = performance.now();
      const delta = Math.min(clock.getDelta(), 1 / 30);
      const time = clock.elapsedTime;

      pointerStrengthRef.current *= Math.pow(0.5, delta * 2.5);

      pointerTargetRef.current.set(
        pointerNormRef.current.x * halfWidth,
        pointerNormRef.current.y * halfHeight,
        0
      );
      pointerWorldRef.current.lerp(pointerTargetRef.current, 1 - Math.pow(0.1, delta * 60));

      const currentPointerStrength = pointerStrengthRef.current;
      const pointerVector = pointerWorldRef.current;

      const positionsArray = particlePositionsRef.current!;
      const velocitiesArray = particleVelocitiesRef.current!;
      const colorArray = particleColorsRef.current!;

      const baseSpeed = config.particleSpeed * delta * speedMultiplierRef.current;
      const noiseStrength = config.noiseStrength * delta;
      const pointerForce = config.pointerForce * delta;

      let colorNeedsUpdate = false;

      const spatialHash = spatialHashRef.current;
      const grid = spatialHash.grid;
      grid.forEach((bucket) => {
        bucket.length = 0;
      });
      const cellSize = spatialHash.cellSize;
      const invCellSize = cellSize > 0 ? 1 / cellSize : 1;

      for (let i = 0; i < config.particleCount; i++) {
        const i3 = i * 3;
        let vx = velocitiesArray[i3];
        let vy = velocitiesArray[i3 + 1];
        let vz = velocitiesArray[i3 + 2];

        vx += Math.sin(time * config.noiseFrequency + i * 0.37) * noiseStrength;
        vy += Math.cos(time * config.noiseFrequency * 1.3 + i * 0.53) * noiseStrength;
        vz += Math.sin(time * config.noiseFrequency * 0.7 + i * 0.11) * noiseStrength;

        const px = positionsArray[i3];
        const py = positionsArray[i3 + 1];
        const pz = positionsArray[i3 + 2];

        if (currentPointerStrength > 0.001) {
          const dx = pointerVector.x - px;
          const dy = pointerVector.y - py;
          const dz = pointerVector.z - pz;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < pointerRadiusSq) {
            const dist = Math.sqrt(distSq) + 0.0001;
            const influence = (1 - dist / config.pointerRadius) * currentPointerStrength;
            const push = (pointerForce * influence) / dist;

            vx -= dx * push;
            vy -= dy * push;
            vz -= dz * push;
          }
        }

        vx *= config.velocityDamping;
        vy *= config.velocityDamping;
        vz *= config.velocityDamping;

        let nx = px + vx * baseSpeed;
        let ny = py + vy * baseSpeed;
        let nz = pz + vz * baseSpeed;

        if (nx > halfWidth) {
          nx = halfWidth;
          vx *= -0.6;
        } else if (nx < -halfWidth) {
          nx = -halfWidth;
          vx *= -0.6;
        }

        if (ny > halfHeight) {
          ny = halfHeight;
          vy *= -0.6;
        } else if (ny < -halfHeight) {
          ny = -halfHeight;
          vy *= -0.6;
        }

        if (nz > halfDepth) {
          nz = halfDepth;
          vz *= -0.6;
        } else if (nz < -halfDepth) {
          nz = -halfDepth;
          vz *= -0.6;
        }

        positionsArray[i3] = nx;
        positionsArray[i3 + 1] = ny;
        positionsArray[i3 + 2] = nz;

        velocitiesArray[i3] = vx;
        velocitiesArray[i3 + 1] = vy;
        velocitiesArray[i3 + 2] = vz;

        const depthFactor = (nz + halfDepth) / config.area.depth;
        let pointerGlow = 0;
        if (currentPointerStrength > 0.001) {
          TEMP_VECTOR.set(nx, ny, nz);
          pointerGlow = THREE.MathUtils.clamp(
            1 - pointerVector.distanceTo(TEMP_VECTOR) / config.pointerRadius,
            0,
            1
          );
        }

        const hue = (i * 0.012 + time * (0.04 + config.effectsFactor * 0.05)) % 1;
        const saturation = 0.38 + config.effectsFactor * 0.25;
        const lightness = THREE.MathUtils.clamp(
          0.42 + depthFactor * 0.18 + pointerGlow * 0.12,
          0,
          0.78
        );

        TEMP_COLOR.setHSL(hue, saturation, lightness);
        colorArray[i3] = TEMP_COLOR.r;
        colorArray[i3 + 1] = TEMP_COLOR.g;
        colorArray[i3 + 2] = TEMP_COLOR.b;
        colorNeedsUpdate = true;

        const cellX = Math.floor(nx * invCellSize);
        const cellY = Math.floor(ny * invCellSize);
        const cellZ = Math.floor(nz * invCellSize);
        const key = `${cellX}|${cellY}|${cellZ}`;

        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(i);
      }

      particleGeometry.attributes.position.needsUpdate = true;

      if (colorNeedsUpdate) {
        particleGeometry.attributes.color.needsUpdate = true;
      }

      const particleOpacity = Math.min(
        0.95,
        config.particleOpacity + currentPointerStrength * 0.22
      );
      particleMaterial.opacity = particleOpacity;
      particleMaterial.needsUpdate = true;

      const linePositionsArray = linePositionsRef.current!;
      const lineColorsArray = lineColorsRef.current!;

      let segmentIndex = 0;
      const particleCount = config.particleCount;
      const neighbourLimit = config.neighbourScanLimit;
      const maxSegments = config.maxSegments;
      const connectionDistance = config.connectionDistance;
      const connectionDistanceSq = connectionDistance * connectionDistance;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const x1 = positionsArray[i3];
        const y1 = positionsArray[i3 + 1];
        const z1 = positionsArray[i3 + 2];

        const cellX = Math.floor(x1 * invCellSize);
        const cellY = Math.floor(y1 * invCellSize);
        const cellZ = Math.floor(z1 * invCellSize);
        const key = `${cellX}|${cellY}|${cellZ}`;
        const baseBucket = grid.get(key);
        if (!baseBucket || baseBucket.length === 0) {
          continue;
        }

        if (segmentIndex >= maxSegments) {
          continue;
        }

        let connectionsForParticle = 0;
        let neighboursChecked = 0;

        outer: for (let dxCell = -1; dxCell <= 1; dxCell++) {
          for (let dyCell = -1; dyCell <= 1; dyCell++) {
            for (let dzCell = -1; dzCell <= 1; dzCell++) {
              const neighbourKey = `${cellX + dxCell}|${cellY + dyCell}|${cellZ + dzCell}`;
              const neighbourBucket = grid.get(neighbourKey);

              if (!neighbourBucket || neighbourBucket.length === 0) {
                continue;
              }

              for (let b = 0; b < neighbourBucket.length; b++) {
                const j = neighbourBucket[b];
                if (j <= i) {
                  continue;
                }

                neighboursChecked++;
                if (neighboursChecked > neighbourLimit) {
                  break outer;
                }

                if (connectionsForParticle >= config.maxConnectionsPerParticle || segmentIndex >= maxSegments) {
                  break outer;
                }

                const j3 = j * 3;
                const dx = positionsArray[j3] - x1;
                const dy = positionsArray[j3 + 1] - y1;
                const dz = positionsArray[j3 + 2] - z1;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq > connectionDistanceSq) {
                  continue;
                }

                const strength = 1 - Math.sqrt(distSq) / connectionDistance;
                const baseIndex = segmentIndex * 6;

                linePositionsArray[baseIndex] = x1;
                linePositionsArray[baseIndex + 1] = y1;
                linePositionsArray[baseIndex + 2] = z1;
                linePositionsArray[baseIndex + 3] = x1 + dx;
                linePositionsArray[baseIndex + 4] = y1 + dy;
                linePositionsArray[baseIndex + 5] = z1 + dz;

                const colorFactor =
                  config.lineColorBoost * THREE.MathUtils.lerp(0.5, 1, strength) * particleOpacity;

                SECOND_COLOR.setRGB(
                  (colorArray[i3] + colorArray[j3]) * 0.5,
                  (colorArray[i3 + 1] + colorArray[j3 + 1]) * 0.5,
                  (colorArray[i3 + 2] + colorArray[j3 + 2]) * 0.5
                );

                lineColorsArray[baseIndex] = SECOND_COLOR.r * colorFactor;
                lineColorsArray[baseIndex + 1] = SECOND_COLOR.g * colorFactor;
                lineColorsArray[baseIndex + 2] = SECOND_COLOR.b * colorFactor;
                lineColorsArray[baseIndex + 3] = SECOND_COLOR.r * colorFactor;
                lineColorsArray[baseIndex + 4] = SECOND_COLOR.g * colorFactor;
                lineColorsArray[baseIndex + 5] = SECOND_COLOR.b * colorFactor;

                segmentIndex++;
                connectionsForParticle++;
              }
            }
          }
        }
      }

      lineGeometry.setDrawRange(0, segmentIndex * 2);
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;

      lineMaterial.opacity = THREE.MathUtils.lerp(
        config.lineBaseOpacity,
        config.lineHighlightOpacity,
        0.5 + Math.sin(time * config.linePulseSpeed * speedMultiplierRef.current) * 0.5
      );
      lineMaterial.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);

      if (onFrameRecord) {
        onFrameRecord(performance.now() - frameStart);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    clock.start();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }

      clock.stop();

      if (groupRef.current) {
        scene.remove(groupRef.current);
        groupRef.current.clear();
        groupRef.current = null;
      }

      particleGeometryRef.current?.dispose();
      particleGeometryRef.current = null;

      if (particleMaterialRef.current) {
        particleMaterialRef.current.dispose();
        particleMaterialRef.current = null;
      }

      textureRef.current?.dispose();
      textureRef.current = null;

      lineGeometryRef.current?.dispose();
      lineGeometryRef.current = null;

      if (lineMaterialRef.current) {
        lineMaterialRef.current.dispose();
        lineMaterialRef.current = null;
      }
    };
  }, [
    sceneRef,
    rendererRef,
    controlsRef,
    requestRef,
    onFrameRecord,
    isVisible,
    config.area.depth,
    config.area.height,
    config.area.width,
    config.effectsFactor,
    config.fogDensity,
    config.lineBaseOpacity,
    config.lineColorBoost,
    config.lineHighlightOpacity,
    config.linePulseSpeed,
    config.maxConnectionsPerParticle,
    config.maxSegments,
    config.connectionDistance,
    config.neighbourScanLimit,
    config.noiseFrequency,
    config.noiseStrength,
    config.particleCount,
    config.particleTextureSize,
    config.particleOpacity,
    config.particleSize,
    config.particleSpeed,
    config.pointerForce,
    config.pointerRadius,
    config.renderScale,
    config.toneMappingExposure,
    config.velocityDamping,
    config.backgroundColor
  ]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
};

export default Neurons;