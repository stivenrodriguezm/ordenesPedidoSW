import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import API from './api';

// Adaptador falso: responde 401 al token viejo y 200 al nuevo.
function adaptador(validos) {
    return vi.fn(async (config) => {
        const token = (config.headers?.Authorization || '').replace('Bearer ', '');
        if (validos.includes(token)) return { data: { ok: token }, status: 200, statusText: 'OK', headers: {}, config };
        const err = new Error('401');
        err.config = config;
        err.response = { status: 401, data: {}, headers: {}, config };
        throw err;
    });
}

describe('Renovación de sesión con varias pestañas (P14-02)', () => {
    const original = API.defaults.adapter;
    beforeEach(() => {
        localStorage.setItem('accessToken', 'A1');
        localStorage.setItem('refreshToken', 'R1');
        window.location.hash = '#/ventas';
    });
    afterEach(() => { API.defaults.adapter = original; vi.restoreAllMocks(); localStorage.clear(); });

    it('renueva y reintenta la petición', async () => {
        API.defaults.adapter = adaptador(['A2']);
        vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'A2', refresh: 'R2' } });
        const r = await API.get('/ventas/');
        expect(r.data.ok).toBe('A2');
        expect(localStorage.getItem('refreshToken')).toBe('R2');
    });

    it('si otra pestaña ya rotó el token, usa el nuevo en vez de cerrar la sesión', async () => {
        API.defaults.adapter = adaptador(['A2']);
        vi.spyOn(axios, 'post').mockImplementation(async () => {
            // Mientras esta pestaña renovaba, la otra guardó A2/R2 y R1 quedó revocado.
            localStorage.setItem('accessToken', 'A2');
            localStorage.setItem('refreshToken', 'R2');
            const err = new Error('blacklisted');
            err.response = { status: 401, data: { detail: 'Token is blacklisted' } };
            throw err;
        });
        const r = await API.get('/ventas/');
        expect(r.data.ok).toBe('A2');
        expect(localStorage.getItem('refreshToken')).toBe('R2');
        expect(window.location.hash).toBe('#/ventas');
    });

    it('refresh realmente inválido: cierra la sesión', async () => {
        API.defaults.adapter = adaptador([]);
        vi.spyOn(axios, 'post').mockRejectedValue(Object.assign(new Error('x'), { response: { status: 401, data: {} } }));
        await expect(API.get('/ventas/')).rejects.toBeTruthy();
        expect(localStorage.getItem('refreshToken')).toBeNull();
    });
});
