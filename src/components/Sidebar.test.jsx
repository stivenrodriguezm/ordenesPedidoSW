import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import API from '../services/api';
import Sidebar from './Sidebar';

vi.mock('../services/api', () => ({ default: { post: vi.fn(() => Promise.resolve({})) } }));
vi.mock('../AppContext', async () => {
    const { createContext } = await vi.importActual('react');
    return { usePermissions: () => () => true, AppContext: createContext(null) };
});

const { AppContext } = await import('../AppContext');

const montar = (ruta, usuario = null, setUsuario = vi.fn()) => render(
    <QueryClientProvider client={new QueryClient()}>
        <AppContext.Provider value={{ usuario, setUsuario }}>
            <MemoryRouter initialEntries={[ruta]}>
                <Routes>
                    <Route path="/login" element={<p>Pantalla de login</p>} />
                    <Route path="/perfil" element={<><Sidebar /><p>Pantalla de perfil</p></>} />
                    <Route path="*" element={<Sidebar />} />
                </Routes>
            </MemoryRouter>
        </AppContext.Provider>
    </QueryClientProvider>
);

describe('Menú principal', () => {
    it.each(['/lista-precios/administrar', '/lista-precios', '/suministros/remisiones'])('solo una opción activa en %s', ruta => {
        const { container } = montar(ruta);
        expect(container.querySelectorAll('.nav-link.active')).toHaveLength(1);
        expect(screen.queryByRole('link', { name: 'Bancos' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /suministros/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Caja', exact: true })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'IA Lottus' })).toBeInTheDocument();
    });
});

describe('Perfil al pie del menú', () => {
    const admin = { first_name: 'Ana', last_name: 'Ruiz', role: 'administrador', username: 'ana' };

    it('muestra el usuario y abre sus opciones: perfil, gestión de usuarios y cerrar sesión', () => {
        montar('/', admin);
        const cuenta = screen.getByRole('button', { name: 'Cuenta de Ana Ruiz' });
        expect(cuenta).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByText('AR')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Mi Perfil/ })).not.toBeInTheDocument();

        fireEvent.click(cuenta);
        expect(cuenta).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', { name: /Gestión de Usuarios/ })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Mi Perfil/ }));
        expect(screen.getByText('Pantalla de perfil')).toBeInTheDocument();
    });

    it('cambia entre modo diurno y nocturno y lo recuerda en este equipo', () => {
        localStorage.removeItem('lottus-tema');
        document.documentElement.dataset.tema = 'diurno';
        montar('/', admin);
        fireEvent.click(screen.getByRole('button', { name: 'Cuenta de Ana Ruiz' }));
        const modo = screen.getByRole('switch', { name: /Modo nocturno/ });
        expect(modo).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(modo);
        expect(modo).toHaveAttribute('aria-checked', 'true');
        expect(document.documentElement.dataset.tema).toBe('nocturno');
        expect(localStorage.getItem('lottus-tema')).toBe('nocturno');
        fireEvent.click(modo);
        expect(document.documentElement.dataset.tema).toBe('diurno');
        expect(localStorage.getItem('lottus-tema')).toBe('diurno');
    });

    it('oculta Gestión de usuarios a quien no es administrador', () => {
        montar('/', { ...admin, role: 'vendedor' });
        fireEvent.click(screen.getByRole('button', { name: 'Cuenta de Ana Ruiz' }));
        expect(screen.queryByRole('button', { name: /Gestión de Usuarios/ })).not.toBeInTheDocument();
    });

    it('cierra sesión: revoca el refresh, borra los tokens y va al login', () => {
        localStorage.setItem('accessToken', 'a');
        localStorage.setItem('refreshToken', 'r');
        const setUsuario = vi.fn();
        montar('/', admin, setUsuario);
        fireEvent.click(screen.getByRole('button', { name: 'Cuenta de Ana Ruiz' }));
        fireEvent.click(screen.getByRole('button', { name: /Cerrar Sesión/ }));
        expect(API.post).toHaveBeenCalledWith('/logout/', { refresh: 'r' });
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        expect(setUsuario).toHaveBeenCalledWith(null);
        expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
    });
});
