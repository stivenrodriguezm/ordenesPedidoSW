import React, { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppContext, AppProvider } from './AppContext';
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
