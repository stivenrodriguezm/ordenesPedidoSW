import React, { useState } from 'react';
import { FaTags } from 'react-icons/fa';

export default function FotoPrecio({ src, alt = '', ...props }) {
  const [fallida, setFallida] = useState(null);
  if (!src || fallida === src) return <div className="lp-foto-no-disponible"><FaTags aria-hidden="true" /><span>Foto no disponible</span></div>;
  return <img src={src} alt={alt} {...props} onError={() => setFallida(src)} />;
}
