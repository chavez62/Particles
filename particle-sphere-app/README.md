# 🎨 Particle Visualization App

A high-performance WebGL particle system with multiple interactive visualizations, built with React, TypeScript, and Three.js.

![Version](https://img.shields.io/badge/version-0.0.0-blue)
![React](https://img.shields.io/badge/react-18.3-blue)
![Three.js](https://img.shields.io/badge/three.js-0.171-green)
![TypeScript](https://img.shields.io/badge/typescript-5.6-blue)

## ✨ Features

- **Multiple Visualizations**
  - 🌐 Particle Sphere with GPU shaders
  - 🧠 Neural Network simulation with spatial hashing
  - ✨ Interactive Sparkles with mouse repulsion

- **Performance Optimizations**
  - Auto-adjusting quality based on device capabilities
  - Spatial hash grid for O(n) neighbor lookups
  - Shared WebGL context to prevent context loss
  - Dynamic particle count adjustment
  - GPU-accelerated rendering

- **User Experience**
  - Real-time FPS monitoring
  - Manual quality controls (Low/Medium/High/Auto)
  - WebGL diagnostics panel
  - Smooth transitions between visualizations
  - Responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Navigate to project
cd Particles/particle-sphere-app

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 📖 Architecture

### Project Structure

```
src/
├── components/        # React components
│   ├── Neurons.tsx           # Neural network visualization
│   ├── ParticleSphere.tsx    # Shader-based sphere
│   ├── SimpleSparkles.tsx    # Interactive particles
│   ├── WebGLDebug.tsx        # Diagnostics panel
│   └── WebGLErrorBoundary.tsx
├── hooks/            # Custom React hooks
│   ├── usePerformanceMonitor.ts  # FPS & quality management
│   ├── useThreeSetup.ts          # Three.js initialization
│   └── useVisibilityDetection.ts # Tab visibility
├── utils/            # Utility functions
│   └── WebGLContextManager.ts    # Shared WebGL context
├── constants/        # App constants
│   └── visualizations.ts
├── styles/           # CSS modules
│   └── ui.module.css
└── App.tsx           # Main application
```

### Key Components

#### **Neurons Component**
Neural network simulation with:
- Spatial hash grid for efficient neighbor detection
- Dynamic connection rendering
- Pointer interaction with particle repulsion
- Adaptive quality settings

Performance: **O(n)** complexity with spatial hashing vs **O(n²)** naive approach

#### **Performance Monitor Hook**
Automatically adjusts:
- Particle count
- Effects level (0-2)
- Render scale (0.5-1.0)

Based on:
- GPU tier detection
- Real-time FPS measurements
- Memory usage (when available)

#### **WebGL Context Manager**
Singleton pattern ensuring:
- One shared WebGL context
- Automatic cleanup after 5min idle
- Context loss/restore handling
- Memory efficiency

## 🎮 Usage

### Switching Visualizations

Click navigation buttons at the top to switch between:
- **Particle Sphere**: Smooth shader-based animation
- **Neurons**: Interactive neural network
- **Interactive Sparkles**: Mouse-repulsion effects

### Quality Settings

Click the ⚙️ button to reveal quality options:
- **Low**: 50% particles, minimal effects, 0.75x scale
- **Medium**: 100% particles, standard effects
- **High**: 150% particles, full effects
- **Auto**: Adaptive based on performance

### Performance Stats

Toggle the 📊 button to show/hide:
- FPS (frames per second)
- Particle count
- Memory usage
- GPU tier (Low/Mid/High-end)
- Current quality level

### WebGL Diagnostics

Click 🔍 to view:
- WebGL version support
- GPU renderer name
- Max texture size
- Shader capabilities
- Available extensions

## ⚙️ Configuration

### Default Particle Counts

Edit `src/constants/visualizations.ts`:

```typescript
export const DEFAULT_PARTICLE_COUNTS = {
  particles: 2000,
  neurons: 150,
  simple: 3000
};
```

### Performance Targets

Modify `src/App.tsx`:

```typescript
const performance = usePerformanceMonitor({
  initialParticleCount: componentParticleCounts[activeViz],
  targetFps: 30,  // Adjust target FPS
  adjustQuality: qualityPreset === 'auto',
  minParticleCount: componentParticleCounts[activeViz] * 0.2,
  maxParticleCount: componentParticleCounts[activeViz] * 1.5
});
```

## 🧪 Testing

### Run Tests

```bash
# Install test dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### Add to package.json:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 🔧 Performance Tips

### For Low-End Devices

1. Set quality to "Low" manually
2. Reduce default particle counts
3. Disable effects (effectsLevel: 0)
4. Lower render scale to 0.5

### For High-End Devices

1. Increase max particle counts
2. Enable full effects (effectsLevel: 2)
3. Add more complex shaders
4. Increase connection distances

### Optimization Checklist

- ✅ Use spatial hashing for neighbor lookups
- ✅ Batch geometry updates
- ✅ Reuse Three.js objects (shared context)
- ✅ Minimize state updates in React
- ✅ Use `useMemo` and `useCallback` strategically
- ✅ Clean up WebGL resources properly
- ✅ Pause rendering when tab is hidden

## 🐛 Troubleshooting

### WebGL Context Lost

The app uses a shared context manager to prevent context loss. If you still experience issues:

1. Check WebGL diagnostics panel
2. Ensure GPU drivers are updated
3. Close other GPU-intensive tabs
4. Reduce quality settings

### Low Performance

1. Enable "Auto" quality mode
2. Close other applications
3. Check GPU tier in performance stats
4. Reduce target FPS if needed

### Memory Leaks

All visualizations properly dispose of:
- Geometries
- Materials
- Textures
- Animation frames

If memory grows over time:
1. Check browser DevTools Performance tab
2. Force garbage collection (if available)
3. Switch visualizations to test cleanup

## 📚 Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) (future migration)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [Spatial Hashing](https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/spatial-hashing-r2697/)

## 🤝 Contributing

Contributions welcome! Areas for improvement:

1. **Web Worker Integration** - Move particle physics to workers
2. **Shader Effects** - Add bloom, SSAO, post-processing
3. **New Visualizations** - DNA helix, galaxy, fireworks
4. **Mobile Optimization** - Touch gestures, reduced defaults
5. **Accessibility** - Reduced motion support, keyboard controls

## 📄 License

MIT License - feel free to use in your projects!

## 🙏 Acknowledgments

- Three.js community
- React team
- WebGL specification contributors

---

**Made with ❤️ and WebGL**
