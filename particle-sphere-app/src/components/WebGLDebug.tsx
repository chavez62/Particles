import React, { useEffect, useState } from 'react';

interface WebGLInfoProps {
  style?: React.CSSProperties;
}

const WebGLDebug: React.FC<WebGLInfoProps> = ({ style }) => {
  const [info, setInfo] = useState<{
    webglSupported: boolean;
    webgl2Supported: boolean;
    renderer: string;
    vendor: string;
    maxTextureSize: number;
    extensions: string[];
    maxAttributes: number;
    maxUniforms: number;
    maxVaryings: number;
    error?: string;
  }>({
    webglSupported: false,
    webgl2Supported: false,
    renderer: 'Unknown',
    vendor: 'Unknown',
    maxTextureSize: 0,
    extensions: [],
    maxAttributes: 0,
    maxUniforms: 0,
    maxVaryings: 0
  });

  useEffect(() => {
    try {
      // Check WebGL 1 support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      
      if (!gl) {
        setInfo(prev => ({
          ...prev,
          webglSupported: false,
          error: 'WebGL is not supported in this browser.'
        }));
        return;
      }
      
      // Check WebGL 2 support
      const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
      
      // Get WebGL info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo 
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) 
        : 'Unknown';
      const vendor = debugInfo 
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) 
        : 'Unknown';
      
      // Get supported extensions
      const extensions = gl.getSupportedExtensions() || [];
      
      // Get max texture size
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      
      // Get shader limits
      const maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      const maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS);
      const maxUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
      
      setInfo({
        webglSupported: true,
        webgl2Supported: !!gl2,
        renderer,
        vendor,
        maxTextureSize,
        extensions,
        maxAttributes,
        maxUniforms,
        maxVaryings
      });
      
      // Cleanup
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      
    } catch (error) {
      setInfo(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, []);

  const debugStyles: React.CSSProperties = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '10px',
    borderRadius: '5px',
    zIndex: 10000,
    maxWidth: '400px',
    maxHeight: '300px',
    overflowY: 'auto',
    ...style
  };

  return (
    <div style={debugStyles}>
      <h3>WebGL Diagnostics</h3>
      
      {info.error && (
        <p style={{ color: 'red' }}>Error: {info.error}</p>
      )}
      
      <p>WebGL 1.0: {info.webglSupported ? '✅' : '❌'}</p>
      <p>WebGL 2.0: {info.webgl2Supported ? '✅' : '❌'}</p>
      <p>Renderer: {info.renderer}</p>
      <p>Vendor: {info.vendor}</p>
      <p>Max Texture Size: {info.maxTextureSize}</p>
      <p>Max Vertex Attributes: {info.maxAttributes}</p>
      <p>Max Vertex Uniforms: {info.maxUniforms}</p>
      <p>Max Vertex Varyings: {info.maxVaryings}</p>
      
      <h4>Extensions ({info.extensions.length})</h4>
      <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
        {info.extensions.map((ext, i) => (
          <div key={i} style={{ fontSize: '10px' }}>{ext}</div>
        ))}
      </div>
    </div>
  );
};

export default WebGLDebug;