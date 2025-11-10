/**
 * Visualization type constants to avoid string literals
 */
export enum VisualizationType {
  PARTICLES = 'particles',
  NEURONS = 'neurons',
  SIMPLE = 'simple'
}

/**
 * Quality level constants
 */
export enum QualityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  AUTO = 'auto'
}

/**
 * Default particle counts for each visualization
 */
export const DEFAULT_PARTICLE_COUNTS: Record<VisualizationType, number> = {
  [VisualizationType.PARTICLES]: 2000,
  [VisualizationType.NEURONS]: 150,
  [VisualizationType.SIMPLE]: 3000
};

/**
 * Visualization display names
 */
export const VISUALIZATION_NAMES: Record<VisualizationType, string> = {
  [VisualizationType.PARTICLES]: 'Particle Sphere',
  [VisualizationType.NEURONS]: 'Neurons',
  [VisualizationType.SIMPLE]: 'Interactive Sparkles'
};

