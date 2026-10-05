import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrRenderer({ value, size = 64, className = '' }) {
  const [svgStr, setSvgStr] = useState('');

  useEffect(() => {
    if (!value) {
      setSvgStr('');
      return;
    }

    QRCode.toString(String(value), {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#0A2540',
        light: '#FFFFFF'
      }
    })
      .then(svg => setSvgStr(svg))
      .catch(err => console.error('QR rendering error:', err));
  }, [value, size]);

  if (!svgStr) {
    return <div style={{ width: size, height: size }} className="bg-slate-100 animate-pulse rounded" />;
  }

  return (
    <div
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: svgStr }}
    />
  );
}
