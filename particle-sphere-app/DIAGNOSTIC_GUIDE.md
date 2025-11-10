# 🔍 FPS Counter Diagnostic Guide

## Current Status
You're seeing FPS stuck at 0. I've added debug logging to help diagnose the issue.

## Step 1: Check Console Logs

1. **Open your browser** (where the app is running)
2. **Open Developer Console** (F12 or right-click → Inspect → Console)
3. **Look for these messages:**

### What You Should See:

```
Recording frames: 60
Recording frames: 120
Recording frames: 180
FPS Update: {frames: X, deltaTime: 1000, fps: 60}
```

### What It Means:

| Message | What It Means |
|---------|---------------|
| `Recording frames: 60` | ✅ Frames ARE being counted |
| `FPS Update: {frames: ...}` | ✅ FPS calculation IS running |
| **No messages at all** | ❌ Problem: Frames not being recorded |

---

## Possible Issues & Solutions

### Issue 1: No "Recording frames" Messages
**Problem:** `onFrameRecord` callback not being called

**Check:**
1. Open browser console
2. Paste this debug code:
```javascript
// Check if visualizations are running
console.log('Active viz:', document.querySelector('[ref=mountRef]'));
```

**Solution:**
The visualizations might not be initialized. Try:
- Refresh the page (Ctrl+F5 / Cmd+Shift+R)
- Switch between visualizations using the top buttons
- Check if there are any WebGL errors in console

---

### Issue 2: "Recording frames" But No "FPS Update"
**Problem:** Performance monitor's update loop not running

**Check Console For:**
- Any errors related to `usePerformanceMonitor`
- Memory/resource warnings

**Solution:**
The performance monitor might be unmounting. This could happen if:
- React StrictMode is causing double-mounting (dev mode issue)
- Component is constantly remounting

---

### Issue 3: FPS Shows 0 Despite Good Logs
**Problem:** Calculation issue

**Check:** Look at the FPS Update log:
```javascript
FPS Update: {frames: 0, deltaTime: 1000, fps: 0}  // frames is 0!
FPS Update: {frames: 60, deltaTime: 1000, fps: 60} // Good!
```

If `frames: 0` → The counter is being reset before any frames accumulate

---

## Step 2: Manual Test

Try this in the browser console while the app is running:

```javascript
// Manually trigger FPS update
const event = new CustomEvent('test-fps');
window.dispatchEvent(event);
console.log('Manual FPS test triggered');
```

---

## Step 3: Check Visualization State

In console, run:

```javascript
// Check if animation loops are running
console.log('RAF count:', 
  Array.from(document.querySelectorAll('canvas')).length
);
```

**Expected:** Should show 1-2 (one for visualization, maybe one for performance monitor)

---

## Common Fixes

### Fix 1: Hard Refresh
Sometimes browser cache causes issues:
- **Windows:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R
- Or: Clear cache in DevTools → Network tab → Disable cache

### Fix 2: Check Dev Server
Make sure the dev server restarted after our changes:
1. Look at terminal where `npm run dev` is running
2. Should show: `server running at http://...`
3. If not, restart it:
```bash
npm run dev
```

### Fix 3: React StrictMode Issue
If you see double logging, React StrictMode might be interfering.

Check `src/main.tsx` for:
```typescript
<React.StrictMode>
```

Try removing it temporarily (for testing only).

---

## What to Report Back

After checking the console, tell me:

1. ✅ **Are you seeing "Recording frames" messages?**
   - Yes / No / Sometimes

2. ✅ **Are you seeing "FPS Update" messages?**
   - Yes / No / Sometimes

3. ✅ **What do the FPS Update logs show?**
   - Copy/paste an example

4. ✅ **Any errors in console?**
   - Red error messages?

5. ✅ **Which visualization are you viewing?**
   - Particle Sphere / Neurons / Interactive Sparkles

---

## Quick Debug Snippet

Paste this entire block into console for a full diagnostic:

```javascript
console.log('=== FPS DIAGNOSTIC ===');
console.log('Canvas count:', document.querySelectorAll('canvas').length);
console.log('Container:', document.querySelector('[style*="100vh"]'));
console.log('Performance stats visible:', !!document.querySelector('.performance-stats'));

// Wait 2 seconds and check frame counting
setTimeout(() => {
  console.log('If you see no "Recording frames" messages above, frames are NOT being counted');
  console.log('If you see "Recording frames", but FPS is 0, calculation is wrong');
}, 2000);
```

---

**Run these diagnostics and let me know what you find!** 🔍

