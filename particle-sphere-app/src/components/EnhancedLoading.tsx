import React, { useEffect, useState } from 'react';

interface EnhancedLoadingProps {
  message?: string;
  visualizationType?: string;
}

const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({ 
  message = 'Loading', 
  visualizationType = 'visualization' 
}) => {
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('Initializing...');

  useEffect(() => {
    const steps = [
      { progress: 20, message: 'Loading Three.js...' },
      { progress: 40, message: 'Creating particles...' },
      { progress: 60, message: 'Setting up shaders...' },
      { progress: 80, message: 'Initializing renderer...' },
      { progress: 100, message: 'Ready!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setLoadingStep(steps[currentStep].message);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [visualizationType]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: 9999
    }}>
      {/* Animated loading dot */}
      <div style={{
        width: '40px',
        height: '40px',
        background: '#00ffff',
        borderRadius: '50%',
        animation: 'pulse 1.5s ease-in-out infinite',
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.8)',
        marginBottom: '30px'
      }} />

      {/* Loading text */}
      <h2 style={{
        color: '#00ffff',
        fontFamily: 'monospace',
        fontSize: '24px',
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: '3px',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
      }}>
        {message}
      </h2>

      {/* Loading step */}
      <p style={{
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'monospace',
        fontSize: '14px',
        marginBottom: '20px',
        minHeight: '20px'
      }}>
        {loadingStep}
      </p>

      {/* Progress bar container */}
      <div style={{
        width: '300px',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Progress bar fill */}
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#00ffff',
          borderRadius: '2px',
          transition: 'width 0.3s ease-out',
          boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)'
        }} />
      </div>

      {/* Progress percentage */}
      <p style={{
        color: '#00ffff',
        fontFamily: 'monospace',
        fontSize: '12px',
        marginTop: '10px'
      }}>
        {progress}%
      </p>

      {/* Visualization name */}
      <p style={{
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'monospace',
        fontSize: '12px',
        marginTop: '20px',
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>
        {visualizationType}
      </p>

      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
            100% {
              transform: scale(0.8);
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
};

export default EnhancedLoading;

