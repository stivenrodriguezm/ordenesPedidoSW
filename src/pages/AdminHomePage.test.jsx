import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppContext } from '../AppContext';
import api from '../services/api';
import AdminHomePage from './AdminHomePage';
import { corto, resumenPeriodo } from '../utils/panelAdmin';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../components/charts', () => ({ Line: () => <div>gráfico de línea</div>, Bar: () => <div>gráfico de barras</div> }));

const panel = (extra = {}) => ({
    hoy: '2026-10-20',
    periodo: { inicio: '2026-10-06', fin: '2026-11-05', dias: 31, dia: 15, anterior_inicio: '2026-09-06', anterior_fin: '2026-10-05' },
    ventas: {
        total: 400000000, cantidad: 2, ticket_promedio: 200000000, hoy_total: 3000000, hoy_cantidad: 1, anterior_corte: 200000000,
        variacion_pct: 100, anterior_total: 700000000, proyeccion: 826666666, descuento_pct: 12.5, con_lista: 2,
        serie_actual: [1, 2], serie_anterior: [1, 2, 3], por_sede: [{ sede: 'Lottus 1', total: 400000000, cantidad: 2 }],
    },
    asesores: [{ id: 1, nombre: 'Ana Ficticia', total: 250000000, ventas: 2 }, { id: 2, nombre: 'Beto Ficticio', total: 150000000, ventas: 1 }],
    dinero: { saldo_caja: 6000000, recaudo_periodo: 90000000, recaudo_hoy: 0, cartera: 5000000, cartera_ventas: 3, ventana_dias: 90 },
    atencion: [
        { clave: 'telas_pendientes', titulo: 'Telas por pedir', detalle: 'Pendientes', cantidad: 4, valor: null, tono: 'warning', ruta: '/telas', grupo: 'telas' },
        { clave: 'facturas_vencidas', titulo: 'Facturas de proveedor vencidas', detalle: 'Vencidas', cantidad: 2, valor: 1500000, tono: 'danger', ruta: '/suministros/facturas', grupo: 'dinero' },
        { clave: 'remisiones_hoy', titulo: 'Entregas para hoy', detalle: 'Hoy', cantidad: 0, valor: null, tono: 'info', ruta: '/suministros/remisiones', grupo: 'entregas' },
    ],
    ia: { agentes: [{ id: 3, nombre: 'Analista de ventas', rol: 'Analiza', icono: 'grafica', color: 'verde' }], informes: [], sin_leer: 0 },
    ultimas_ventas: [{ id: 2533, cliente: 'Cliente ficticio', fecha: '2026-10-20', valor_total: 3000000, saldo: 0, estado: 'pendiente', gestion: 'atrasada', sede: 'Lottus 1', vendedores: 'Ana' }],
    ...extra,
});

function Chat() {
    const { state } = useLocation();
    return <p>Chat con borrador: {state?.borrador}</p>;
}

const montar = () => render(
    <AppContext.Provider value={{ usuario: { first_name: 'Stiven', role: 'administrador', permissions: [] } }}>
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<AdminHomePage />} />
                <Route path="/IA/general" element={<Chat />} />
            </Routes>
        </MemoryRouter>
    </AppContext.Provider>
);

beforeEach(() => vi.resetAllMocks());

describe('Panel general del administrador', () => {
    it('resume el período y prioriza lo que requiere atención', async () => {
        api.get.mockResolvedValue({ data: panel() });
        montar();
        expect(await screen.findByText(/Llevas \$400 M en 2 ventas, 100 % por encima/)).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/dashboard-admin/');
        expect(screen.getByText('Período 6 oct – 5 nov · día 15 de 31')).toBeInTheDocument();

        const alertas = screen.getAllByRole('link', { name: /vencidas|por pedir/ });
        expect(alertas[0]).toHaveAttribute('href', '/suministros/facturas'); // lo urgente primero
        expect(within(alertas[0]).getByText('$1,5 M')).toBeInTheDocument();
        expect(alertas[1]).toHaveAttribute('href', '/telas');
        expect(screen.getByText('Al día').parentElement).toHaveTextContent('Entregas para hoy');

        expect(screen.getByText('Ana Ficticia')).toBeInTheDocument();
        expect(screen.getByText('118 % de lo que cerró el período anterior ($700 M)')).toBeInTheDocument();
        expect(screen.getByText('Atrasada')).toBeInTheDocument();
    });

    it('lleva la pregunta a IA Lottus como borrador, sin enviarla', async () => {
        api.get.mockResolvedValue({ data: panel() });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /qué facturas de proveedor vencidas/i }));
        expect(screen.getByText('Chat con borrador: ¿Qué facturas de proveedor vencidas debo pagar primero?')).toBeInTheDocument();
    });

    it('oculta la IA sin permiso y avisa cuando todo está al día', async () => {
        api.get.mockResolvedValue({ data: panel({ ia: null, atencion: [{ ...panel().atencion[2] }] }) });
        montar();
        expect(await screen.findByText(/Todo al día/)).toBeInTheDocument();
        expect(screen.queryByText('Pregúntale al negocio')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Preguntar a la IA/ })).not.toBeInTheDocument();
    });
});

describe('Formato del panel', () => {
    it('abrevia cifras y arma la frase sin ventas', () => {
        expect(corto(785704000)).toBe('$785,7\u00a0M');
        expect(corto(12300)).toBe('$12,3\u00a0mil');
        expect(corto(950)).toBe('$950');
        expect(resumenPeriodo({ ventas: { cantidad: 0 }, periodo: { dia: 4, dias: 31 } })).toBe('Aún no hay ventas en este período (día 4 de 31).');
    });
});
