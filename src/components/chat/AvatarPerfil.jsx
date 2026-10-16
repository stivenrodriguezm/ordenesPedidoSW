import React from 'react';
import { COLORES, ICONOS } from './catalogoIA';
import './AvatarPerfil.css';

/* Avatar de un perfil de IA: ícono blanco sobre su color. tamano: px. */
export default function AvatarPerfil({ perfil, tamano = 34, className = '' }) {
    const { Icono } = ICONOS[perfil?.icono] || ICONOS.robot;
    const color = (COLORES[perfil?.color] || COLORES.azul).valor;
    return (
        <span className={`pf-avatar ${className}`} aria-hidden="true"
            style={{ '--pf-color': color, width: tamano, height: tamano, fontSize: Math.round(tamano * 0.45) }}>
            <Icono />
        </span>
    );
}
