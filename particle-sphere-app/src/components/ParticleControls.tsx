import React, { memo, useCallback } from 'react';

export interface ParticleSettings {
  particleCount: number;
  particleSize: number;
  speed: number;
  glowIntensity: number;
  rotationSpeed: number;
}

interface ParticleControlsProps {
  settings: ParticleSettings;
  onChange: (settings: ParticleSettings) => void;
  isVisible: boolean;
  onClose: () => void;
  minParticles: number;
  maxParticles: number;
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

const SliderControl = memo(({ label, value, min, max, step, onChange, unit = '' }: SliderControlProps) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        color: '#00ffff',
        fontFamily: 'monospace',
        fontSize: '13px'
      }}>
        <span>{label}</span>
        <span style={{ color: '#fff' }}>{Math.round(value)}{unit}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          style={{
            width: '100%',
            height: '6px',
            background: `linear-gradient(to right, #00ffff 0%, #00ffff ${percentage}%, rgba(255, 255, 255, 0.2) ${percentage}%, rgba(255, 255, 255, 0.2) 100%)`,
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
            WebkitAppearance: 'none',
            appearance: 'none'
          }}
        />
      </div>
    </div>
  );
});

SliderControl.displayName = 'SliderControl';

const ParticleControls: React.FC<ParticleControlsProps> = ({ 
  settings, 
  onChange, 
  isVisible,
  onClose,
  minParticles,
  maxParticles
}) => {
  
  const handleParticleCountChange = useCallback((value: number) => {
    onChange({ ...settings, particleCount: value });
  }, [settings, onChange]);

  const handleSizeChange = useCallback((value: number) => {
    onChange({ ...settings, particleSize: value });
  }, [settings, onChange]);

  const handleSpeedChange = useCallback((value: number) => {
    onChange({ ...settings, speed: value });
  }, [settings, onChange]);

  const handleGlowChange = useCallback((value: number) => {
    onChange({ ...settings, glowIntensity: value });
  }, [settings, onChange]);

  const handleRotationChange = useCallback((value: number) => {
    onChange({ ...settings, rotationSpeed: value });
  }, [settings, onChange]);

  const handleReset = useCallback(() => {
    onChange({
      particleCount: Math.floor((minParticles + maxParticles) / 2),
      particleSize: 2,
      speed: 1,
      glowIntensity: 1,
      rotationSpeed: 1
    });
  }, [onChange, minParticles, maxParticles]);

  if (!isVisible) return null;

  return (
    <>
      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            background: #00ffff;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
            transition: all 0.2s ease;
          }

          input[type="range"]::-webkit-slider-thumb:hover {
            width: 20px;
            height: 20px;
            box-shadow: 0 0 15px rgba(0, 255, 255, 1);
          }

          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: #00ffff;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
            border: none;
            transition: all 0.2s ease;
          }

          input[type="range"]::-moz-range-thumb:hover {
            width: 20px;
            height: 20px;
            box-shadow: 0 0 15px rgba(0, 255, 255, 1);
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
      
      <div style={{
        position: 'fixed',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        zIndex: 1001,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(0, 255, 255, 0.5)',
        borderRadius: '12px',
        padding: '20px',
        minWidth: '280px',
        maxWidth: '320px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)',
        animation: 'slideIn 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)'
        }}>
          <h3 style={{
            margin: 0,
            color: '#00ffff',
            fontFamily: 'monospace',
            fontSize: '16px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>
            ⚙️ Particle Controls
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00ffff';
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            ×
          </button>
        </div>

        {/* Controls */}
        <div>
          <SliderControl
            label="Particle Count"
            value={settings.particleCount}
            min={minParticles}
            max={maxParticles}
            step={50}
            onChange={handleParticleCountChange}
          />

          <SliderControl
            label="Particle Size"
            value={settings.particleSize}
            min={0.5}
            max={5}
            step={0.1}
            onChange={handleSizeChange}
            unit="px"
          />

          <SliderControl
            label="Speed"
            value={settings.speed}
            min={0}
            max={3}
            step={0.1}
            onChange={handleSpeedChange}
            unit="x"
          />

          <SliderControl
            label="Glow Intensity"
            value={settings.glowIntensity}
            min={0}
            max={3}
            step={0.1}
            onChange={handleGlowChange}
            unit="x"
          />

          <SliderControl
            label="Rotation Speed"
            value={settings.rotationSpeed}
            min={0}
            max={3}
            step={0.1}
            onChange={handleRotationChange}
            unit="x"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            backgroundColor: 'rgba(0, 255, 255, 0.1)',
            color: '#00ffff',
            border: '1px solid rgba(0, 255, 255, 0.5)',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🔄 Reset to Default
        </button>

        {/* Info text */}
        <p style={{
          marginTop: '15px',
          marginBottom: 0,
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'monospace',
          fontSize: '11px',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          Changes apply in real-time
        </p>
      </div>
    </>
  );
};

export default memo(ParticleControls);

