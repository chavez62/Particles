import * as THREE from 'three';

class WebGLContextManager {
  private static instance: WebGLContextManager;
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private activeUsers = 0;
  private lastUseTimestamp = 0;
  private contextLostHandler: ((event: Event) => void) | null = null;
  private contextRestoredHandler: ((event: Event) => void) | null = null;
  
  // Timer for automatic cleanup
  private cleanupTimer: number | null = null;
  private readonly CLEANUP_INTERVAL = 60000; // 60 seconds
  private readonly MAX_IDLE_TIME = 300000; // 5 minutes

  private constructor() {
    // Set up automatic resource cleanup
    this.setupCleanupTimer();
  }

  static getInstance(): WebGLContextManager {
    if (!WebGLContextManager.instance) {
      WebGLContextManager.instance = new WebGLContextManager();
    }
    return WebGLContextManager.instance;
  }

  private setupCleanupTimer(): void {
    // Clear any existing timer
    if (this.cleanupTimer !== null) {
      window.clearInterval(this.cleanupTimer);
    }
    
    // Set up a new timer that checks for unused renderer
    this.cleanupTimer = window.setInterval(() => {
      const currentTime = Date.now();
      
      // If renderer exists but hasn't been used for MAX_IDLE_TIME and has no active users
      if (this.renderer && this.activeUsers === 0 && 
          (currentTime - this.lastUseTimestamp) > this.MAX_IDLE_TIME) {
        console.log('Disposing unused WebGL renderer');
        this.forceDisposeRenderer();
      }
    }, this.CLEANUP_INTERVAL);
  }

  getRenderer(): THREE.WebGLRenderer {
    this.lastUseTimestamp = Date.now();
    
    if (!this.renderer) {
      console.log('Creating new WebGL renderer');
      this.canvas = document.createElement('canvas');
      
      // Create renderer with simplified settings for better compatibility
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true, // Enable antialiasing for better visuals
        powerPreference: "default", // Use default power preference
        alpha: true,
        preserveDrawingBuffer: true, // Enable buffer preservation for compatibility
        precision: "mediump" // Use medium precision
      });
      
      // Use standard pixel ratio
      this.renderer.setPixelRatio(window.devicePixelRatio);
      
      console.log('WebGL renderer created successfully');
      
      // Add context loss/restore event listeners
      this.setupContextEventListeners();
    }
    
    this.activeUsers++;
    return this.renderer;
  }

  private setupContextEventListeners(): void {
    if (!this.canvas) return;
    
    // Handle WebGL context loss
    this.contextLostHandler = (event: Event) => {
      console.warn('WebGL context lost');
      event.preventDefault();
      
      // Notify any observers if needed
      // this.dispatchEvent({ type: 'contextlost' });
    };
    
    // Handle WebGL context restoration
    this.contextRestoredHandler = () => {
      console.warn('WebGL context restored');
      
      // Recreate renderer if needed
      if (this.activeUsers > 0 && !this.renderer) {
        this.getRenderer(); // This will recreate the renderer
      }
      
      // Notify any observers if needed
      // this.dispatchEvent({ type: 'contextrestored' });
    };
    
    this.canvas.addEventListener('webglcontextlost', this.contextLostHandler, false);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler, false);
  }

  releaseRenderer(): void {
    this.activeUsers = Math.max(0, this.activeUsers - 1);
    
    if (this.activeUsers === 0 && this.renderer) {
      // Update last use timestamp
      this.lastUseTimestamp = Date.now();
      
      // Note: we don't immediately dispose the renderer to allow for reuse
      // The cleanup timer will dispose it after MAX_IDLE_TIME if not reused
    }
  }
  
  // Force immediate disposal of renderer
  forceDisposeRenderer(): void {
    if (this.renderer) {
      // Remove event listeners
      if (this.canvas && this.contextLostHandler && this.contextRestoredHandler) {
        this.canvas.removeEventListener('webglcontextlost', this.contextLostHandler);
        this.canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler);
      }
      
      // Dispose renderer
      this.renderer.dispose();
      this.renderer = null;
      this.canvas = null;
      this.contextLostHandler = null;
      this.contextRestoredHandler = null;
    }
  }

  resizeRenderer(width: number, height: number): void {
    if (this.renderer) {
      this.lastUseTimestamp = Date.now();
      this.renderer.setSize(width, height);
    }
  }
  
  // Clean up when application shutdowns
  cleanup(): void {
    if (this.cleanupTimer !== null) {
      window.clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.forceDisposeRenderer();
  }
  
  // Debug method to check current state
  getStatus(): { activeUsers: number, hasRenderer: boolean, idleTime: number } {
    return {
      activeUsers: this.activeUsers,
      hasRenderer: this.renderer !== null,
      idleTime: this.renderer ? Date.now() - this.lastUseTimestamp : -1
    };
  }
}

export default WebGLContextManager;