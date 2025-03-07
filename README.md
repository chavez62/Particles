# Particles

An interactive WebGL particle visualization project built with React, TypeScript, and Three.js.

## Features

- Multiple interactive particle visualizations:
  - Basic particle sphere with GLSL shaders
  - Interactive sparkling sphere with mouse interaction
  - Simple sparkles effect
  - Interactive sparkles with mouse-following behavior
  - Neural network-inspired particle connections

## Tech Stack

- React 18
- TypeScript
- Three.js for 3D rendering
- GLSL shaders for GPU-accelerated animations
- Vite for fast development and bundling

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/chavez62/Particles.git
   cd Particles
   ```

2. Install dependencies:
   ```
   cd particle-sphere-app
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

- `particle-sphere-app/` - Main React application
  - `src/components/` - React components for different particle visualizations
  - `src/hooks/` - Custom React hooks for Three.js setup and performance monitoring
  - `src/utils/` - Utility functions for WebGL context management

## Performance Considerations

All visualizations are optimized for performance with techniques like:
- GPU-accelerated GLSL shaders
- Efficient particle system implementations
- Performance monitoring
- Automatic quality adjustments based on device capabilities

## License

MIT