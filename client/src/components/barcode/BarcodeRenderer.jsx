import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeRenderer({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 42,
  displayValue = true,
  fontSize = 11,
  className = ''
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format,
          width,
          height,
          displayValue,
          font: 'JetBrains Mono',
          fontSize,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={`max-w-full inline-block ${className}`}
    />
  );
}
