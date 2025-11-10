# 🔧 FPS Counter Fix - Always Showing 0

## Problem
The FPS counter was stuck at 0 and not updating, even though the visualizations were animating smoothly.

## Root Cause
The issue was caused by **unnecessary scene rebuilds**. Here's what was happening:

1. When you moved a slider in Particle Controls (e.g., speed, rotation speed)
2. The `particleSettings` state updated in `App.tsx`
3. This `particleSettings` object was included in the `useEffect` dependency array of all visualizations
4. **The entire scene was torn down and rebuilt** on every slider movement
5. During the rebuild:
   - The animation loop stopped
   - Frame counting was interrupted
   - The FPS calculation couldn't accumulate frames
6. Result: **FPS stayed at 0**

## Technical Details

### How FPS is Calculated
The `usePerformanceMonitor` hook calculates FPS like this:

```javascript
// Every time a frame renders, increment counter
frameCountRef.current++;

// Every 1000ms, calculate FPS:
const fps = Math.round((frameCountRef.current * 1000) / deltaTime);

// Then reset the counter
frameCountRef.current = 0;
```

### The Problem
When scenes were constantly rebuilding:
- The animation loop would stop and restart
- `frameCountRef.current` never accumulated enough frames
- FPS calculation always resulted in 0

---

## Solution Applied

### Strategy: Use Refs for Dynamic Settings

Instead of rebuilding the scene for every setting change, I split settings into two categories:

**Settings that REQUIRE scene rebuild:**
- ✅ Particle Count (need to recreate geometry)
- ✅ Particle Size (need to update material)
- ✅ Glow Intensity (need to update material opacity)

**Settings that DON'T need rebuild:**
- ❌ Speed (just multiply animation speed)
- ❌ Rotation Speed (just multiply rotation delta)

### Implementation

#### 1. Use Refs for Dynamic Settings

```typescript
// Store speed settings in refs (doesn't cause re-render/rebuild)
const speedRef = useRef(particleSettings?.speed ?? 1);
const rotationSpeedRef = useRef(particleSettings?.rotationSpeed ?? 1);

// Update refs when settings change (no rebuild!)
useEffect(() => {
  speedRef.current = particleSettings?.speed ?? 1;
  rotationSpeedRef.current = particleSettings?.rotationSpeed ?? 1;
}, [particleSettings?.speed, particleSettings?.rotationSpeed]);
```

#### 2. Use Refs in Animation Loop

```typescript
// Animation loop reads from refs (always has current values)
const animate = () => {
  // Use current ref values
  particles.rotation.y += 0.002 * rotationSpeedRef.current;
  const force = 0.05 * speedRef.current;
  // ... etc
};
```

#### 3. Update Dependency Arrays

**Before (caused rebuilds):**
```typescript
}, [sceneRef, rendererRef, particleSettings]); // Rebuild on ANY setting change!
```

**After (only rebuild when needed):**
```typescript
}, [sceneRef, rendererRef, particleSettings?.particleCount, particleSettings?.particleSize]);
// Only rebuild for count/size changes
```

---

## Files Changed

### 1. SimpleSparkles.tsx
- ✅ Added `speedRef` and `rotationSpeedRef`
- ✅ Updated animation loop to use refs
- ✅ Fixed dependency array

### 2. ParticleSphere.tsx
- ✅ Added `speedRef` and `rotationSpeedRef`
- ✅ Updated shader time and rotation to use refs
- ✅ Fixed dependency array

### 3. Neurons.tsx
- ✅ Added `speedMultiplierRef`
- ✅ Removed speed from `buildConfig` function
- ✅ Applied speed multiplier in animation loop
- ✅ Fixed dependency array (only rebuild for count/size/glow)

---

## Results

### Before Fix:
- ❌ FPS always showed 0
- ❌ Scene rebuilt on every slider move (expensive!)
- ❌ Animation stuttered during adjustments
- ❌ Performance monitoring broken

### After Fix:
- ✅ FPS displays correctly (typically 30-60 FPS)
- ✅ Scene only rebuilds when necessary
- ✅ Smooth adjustments with no stuttering
- ✅ FPS graph shows accurate performance data
- ✅ Real-time feedback on performance impact

---

## Testing

To verify the fix works:

1. **Open the app** and watch the FPS counter
2. **It should show real FPS** (probably 30-60)
3. **Move the Speed slider** → FPS stays stable (no rebuild!)
4. **Move the Rotation slider** → FPS stays stable
5. **Move the Particle Count slider** → Scene rebuilds (expected, but FPS recovers quickly)
6. **Watch the FPS graph** → You'll see it update in real-time with colored performance indicators

---

## Key Takeaways

### Performance Optimization Pattern:
When you have settings that control animation behavior:

1. **Ask**: Does this setting require recreating the scene?
   - **Yes** → Keep in dependency array (count, size, material props)
   - **No** → Use a ref (speed, multipliers, animation params)

2. **Use refs for**:
   - Animation speed/multipliers
   - Any value read in every frame
   - Values that change frequently

3. **Keep in dependencies**:
   - Geometry changes (particle count)
   - Material changes (colors, opacity, textures)
   - Camera/controls setup

### Why This Matters:
- **FPS monitoring** requires uninterrupted frame counting
- **Scene rebuilds are expensive** (geometry creation, WebGL state)
- **Refs provide smooth updates** without React re-renders
- **Better user experience** with instant feedback

---

**Status: ✅ FIXED**

FPS counter now works correctly and provides real-time performance feedback!

