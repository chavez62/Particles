import { useEffect, useCallback, useRef } from 'react';

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onRotate?: (angle: number) => void;
  onDoubleTap?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
}

const useMobileGestures = (
  elementRef: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks
) => {
  const touchStartRef = useRef<TouchPoint[]>([]);
  const lastTapTimeRef = useRef<number>(0);
  const initialPinchDistanceRef = useRef<number>(0);
  const initialRotationAngleRef = useRef<number>(0);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate angle between two touch points
  const getAngle = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches);
    touchStartRef.current = touches.map(t => ({ x: t.clientX, y: t.clientY }));

    // Handle double tap
    if (touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        callbacks.onDoubleTap?.();
      }
      lastTapTimeRef.current = now;
    }

    // Initialize pinch/rotate for two fingers
    if (touches.length === 2) {
      initialPinchDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      initialRotationAngleRef.current = getAngle(e.touches[0], e.touches[1]);
    }
  }, [callbacks, getDistance, getAngle]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault(); // Prevent default zoom

      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const currentAngle = getAngle(e.touches[0], e.touches[1]);

      // Handle pinch zoom
      if (callbacks.onPinch && initialPinchDistanceRef.current > 0) {
        const scale = currentDistance / initialPinchDistanceRef.current;
        callbacks.onPinch(scale);
      }

      // Handle rotation
      if (callbacks.onRotate && initialRotationAngleRef.current !== null) {
        const angleDiff = currentAngle - initialRotationAngleRef.current;
        callbacks.onRotate(angleDiff);
      }
    }
  }, [callbacks, getDistance, getAngle]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartRef.current.length === 1 && e.changedTouches.length === 1) {
      const startTouch = touchStartRef.current[0];
      const endTouch = e.changedTouches[0];

      const dx = endTouch.clientX - startTouch.x;
      const dy = endTouch.clientY - startTouch.y;

      const minSwipeDistance = 50;
      const maxSwipeTime = 300;

      // Check if it was a quick swipe
      if (Math.abs(dx) > minSwipeDistance || Math.abs(dy) > minSwipeDistance) {
        // Horizontal swipe
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            callbacks.onSwipeRight?.();
          } else {
            callbacks.onSwipeLeft?.();
          }
        } 
        // Vertical swipe
        else {
          if (dy > 0) {
            callbacks.onSwipeDown?.();
          } else {
            callbacks.onSwipeUp?.();
          }
        }
      }
    }

    // Reset pinch/rotate
    if (e.touches.length < 2) {
      initialPinchDistanceRef.current = 0;
      initialRotationAngleRef.current = 0;
    }
  }, [callbacks]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);
};

export default useMobileGestures;

