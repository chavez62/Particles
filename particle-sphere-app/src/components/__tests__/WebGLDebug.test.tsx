import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WebGLDebug from '../WebGLDebug';

describe('WebGLDebug', () => {
  it('should render WebGL diagnostics', () => {
    render(<WebGLDebug />);
    
    expect(screen.getByText(/WebGL Diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText(/WebGL 1.0:/i)).toBeInTheDocument();
    expect(screen.getByText(/WebGL 2.0:/i)).toBeInTheDocument();
  });

  it('should display renderer information', () => {
    render(<WebGLDebug />);
    
    expect(screen.getByText(/Renderer:/i)).toBeInTheDocument();
    expect(screen.getByText(/Vendor:/i)).toBeInTheDocument();
  });

  it('should show WebGL parameters', () => {
    render(<WebGLDebug />);
    
    expect(screen.getByText(/Max Texture Size:/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Vertex Attributes:/i)).toBeInTheDocument();
  });

  it('should list extensions', () => {
    render(<WebGLDebug />);
    
    expect(screen.getByText(/Extensions/i)).toBeInTheDocument();
  });

  it('should accept custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const { container } = render(<WebGLDebug style={customStyle} />);
    
    const debugElement = container.firstChild as HTMLElement;
    expect(debugElement).toHaveStyle({ backgroundColor: 'red' });
  });
});

