import React, { useRef, useState, useCallback, useEffect } from 'react';

interface DigitalSignatureProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
}

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 150;

export default function DigitalSignature({ onSave, onCancel }: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx;
  }, []);

  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      let clientX: number;
      let clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * (CANVAS_WIDTH / rect.width),
        y: (clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getCtx, getPos]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawing(true);
    },
    [isDrawing, getCtx, getPos]
  );

  const stopDrawing = useCallback(() => {
    const ctx = getCtx();
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  }, [getCtx]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.beginPath();
    setHasDrawing(false);
  }, [getCtx]);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawing) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }, [hasDrawing, onSave]);

  // Setup canvas context on mount
  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1a1a';
  }, [getCtx]);

  return (
    <div
      className="glass-panel"
      style={{ padding: '24px', maxWidth: 360, margin: '0 auto' }}
    >
      <h3
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          fontWeight: 700,
          color: '#e8f5e9',
          textAlign: 'center',
        }}
      >
        <i className="fa-solid fa-signature" style={{ marginRight: 8, color: '#85bb65' }} />
        Digital Signature
      </h3>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="signature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: '100%', maxWidth: CANVAS_WIDTH, height: 'auto' }}
        />
      </div>

      <p
        style={{
          margin: '0 0 20px',
          fontSize: 12,
          color: '#4a6354',
          textAlign: 'center',
        }}
      >
        Sign above using mouse or touch
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button type="button" className="neo-btn neo-btn--danger" onClick={onCancel}>
          <i className="fa-solid fa-xmark" />
          Cancel
        </button>
        <button type="button" className="neo-btn" onClick={clear}>
          <i className="fa-solid fa-eraser" />
          Clear
        </button>
        <button
          type="button"
          className="neo-btn neo-btn--gold"
          onClick={save}
          disabled={!hasDrawing}
        >
          <i className="fa-solid fa-check" />
          Save
        </button>
      </div>
    </div>
  );
}
