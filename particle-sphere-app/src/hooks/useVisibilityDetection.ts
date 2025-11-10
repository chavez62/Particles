import { useEffect, useState } from 'react';

/**
 * Hook to detect when the page/tab becomes visible or hidden
 * Useful for pausing animations when tab is in background
 */
export const useVisibilityDetection = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

export default useVisibilityDetection;

