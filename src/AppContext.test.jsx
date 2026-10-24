import React, { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppContext, AppProvider, usePermissions } from './AppContext';
import API from './services/api';

vi.mock('./services/api', () => ({ default: { get: vi.fn() } }));

function Sesion() {
  const { usuario, sessionError, isLoading, retrySession } = useContext(AppContext);
  return <>
    <p>{isLoading ? 'Cargando' : usuario?.username || sessionError}</p>
    <button onClick={retrySession}>Reintentar</button>
  </>;
}

describe('Recuperar la sesión al alcanzar un límite de solicitudes', () => {
  it('informa cuánto esperar sin cerrar sesión y permite recuperarla', async () => {
    localStorage.setItem('accessToken', 'token-valido');
    localStorage.setItem('refreshToken', 'refresh-valido');
    API.get.mockReset();
    API.get.mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '42' } } });
    render(<AppProvider><Sesion /></AppProvider>);
    expect(await screen.findByText(/Espera 42 segundos/)).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBe('token-valido');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-valido');
    API.get.mockImplementation(async (url) => ({ data: url === '/user/' ? { username: 'Stiven', permissions: [] } : [] }));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Stiven')).toBeInTheDocument();
  });
});

function Permiso({ codigo }) {
  const hasPermission = usePermissions();
  return <p>{codigo}: {hasPermission(codigo) ? 'sí' : 'no'}</p>;
}

describe('Permisos del rol administrador', () => {
  it('sigue lo configurado en Gestión de usuarios, como cualquier rol', () => {
    const usuario = { role: 'administrador', permissions: ['VER_TODAS_VENTAS'] };
    render(<AppContext.Provider value={{ usuario }}>
      <Permiso codigo="VER_TODAS_VENTAS" />
      <Permiso codigo="MARCAR_VENTA_FACTURADA" />
      <Permiso codigo="VER_LISTA_PRECIOS" />
      <Permiso codigo="GESTION_WEB" />
    </AppContext.Provider>);
    expect(screen.getByText('VER_TODAS_VENTAS: sí')).toBeInTheDocument();
    expect(screen.getByText('MARCAR_VENTA_FACTURADA: no')).toBeInTheDocument();
    expect(screen.getByText('VER_LISTA_PRECIOS: no')).toBeInTheDocument();
    expect(screen.getByText('GESTION_WEB: no')).toBeInTheDocument();
  });

  it('sin configuración guardada (ALL) conserva el acceso total', () => {
    render(<AppContext.Provider value={{ usuario: { role: 'administrador', permissions: ['ALL'] } }}>
      <Permiso codigo="VER_LISTA_PRECIOS" />
    </AppContext.Provider>);
    expect(screen.getByText('VER_LISTA_PRECIOS: sí')).toBeInTheDocument();
  });
});
