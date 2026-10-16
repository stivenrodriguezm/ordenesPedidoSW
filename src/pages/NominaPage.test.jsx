import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../AppContext';
import NominaPage from './NominaPage';
import * as servicio from '../services/nominaService';

vi.mock('../services/nominaService', () => ({
    obtenerConfig: vi.fn(), guardarConfig: vi.fn(), listarAsesores: vi.fn(), guardarAsesor: vi.fn(),
    listarCierres: vi.fn(), crearCierre: vi.fn(), obtenerCierre: vi.fn(), borrarCierre: vi.fn(), accionCierre: vi.fn(),
    editarAsesorCierre: vi.fn(), agregarAjuste: vi.fn(), editarLinea: vi.fn(), borrarLinea: vi.fn(), accionAsesor: vi.fn(), ventaDeLinea: vi.fn(),
}));

const totales = { salario_basico: '1300000', comisiones: '32400', bonificaciones: '0', ajustes: '0', total_nomina: '32400', comisiones_pendientes: '8000', bonificaciones_pendientes: '13000' };
const cierre = (estado = 'borrador') => ({
    id: 3, nombre: 'Nómina septiembre', fecha_inicio: '2026-09-06', fecha_fin: '2026-10-05', estado, dia_pago_basico: 20, pago_nomina: 'entre el 6 y el 11',
    abono_minimo_pct: '30', bonificacion_pct: '1', tabla_comision: [], resumen: { ...totales, ventas_periodo: '1300000', descuento_global_pct: '10.00' },
    asesores_cerrados: estado === 'cerrado' ? 1 : 0, asesores_total: 1,
    asesores: [{
        id: 7, asesor: 1, nombre: 'Ana Ficticia', salario_basico: '1300000', meta: '1000000', ventas_periodo: '1300000', cumple_meta: true,
        cumple_meta_manual: null, nota: '', totales: { ...totales, descuento_global_pct: '10.00' },
        estado: estado === 'cerrado' ? 'cerrado' : 'abierto', cerrado_por: estado === 'cerrado' ? 'Admin' : null, cerrado_en: null,
        lineas: [
            { id: 11, tipo: 'comision', venta: 501, cliente: 'Cliente ficticio', fecha_venta: '2026-09-10', estado_venta: 'pendiente', valor_venta: '900000', participantes: 1, base: '900000', precio_lista: '1000000', descuento_pct: '10', porcentaje: '3.6', valor: '32400', abono_pct: '33.3', pagar: true, motivo_pendiente: '', editada: false, nota: '' },
            { id: 12, tipo: 'comision', venta: 502, cliente: 'Otro ficticio', fecha_venta: '2026-09-12', estado_venta: 'pendiente', valor_venta: '200000', participantes: 1, base: '200000', precio_lista: null, descuento_pct: '0', porcentaje: '4', valor: '8000', abono_pct: '20', pagar: false, motivo_pendiente: 'Abono menor al 30 %', editada: false, nota: '' },
        ],
    }],
});

function montar(permissions) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={client}>
        <AppContext.Provider value={{ usuario: { id: 1, role: 'auxiliar', permissions } }}>
            <MemoryRouter initialEntries={['/nomina']}><NominaPage /></MemoryRouter>
        </AppContext.Provider>
    </QueryClientProvider>);
}

beforeEach(() => {
    vi.resetAllMocks();
    servicio.listarCierres.mockResolvedValue({ periodo_sugerido: { fecha_inicio: '2026-10-06', fecha_fin: '2026-11-05' }, cierres: [cierre()] });
    servicio.obtenerCierre.mockResolvedValue(cierre());
});

describe('Nómina', () => {
    it('elige el cierre en una lista desplegable con su período y estado', async () => {
        const user = userEvent.setup();
        const agosto = { ...cierre('cerrado'), id: 2, nombre: 'Agosto 26', fecha_inicio: '2026-08-06', fecha_fin: '2026-09-05' };
        servicio.listarCierres.mockResolvedValue({ periodo_sugerido: {}, cierres: [cierre(), agosto] });
        servicio.obtenerCierre.mockImplementation(async id => (String(id) === '2' ? agosto : cierre()));
        montar(['VER_NOMINA']);
        const lista = await screen.findByRole('combobox', { name: 'Cierre de nómina' });
        expect(within(lista).getAllByRole('option').map(o => o.textContent)).toEqual([
            'Nómina septiembre · 6/9/2026 al 5/10/2026 · Abierto', 'Agosto 26 · 6/8/2026 al 5/9/2026 · Cerrado']);
        await user.selectOptions(lista, '2');
        expect(await screen.findByRole('heading', { name: 'Agosto 26' })).toBeInTheDocument();
    });

    it('muestra el cierre general y el detalle del asesor en su pestaña, sin ventanas encima', async () => {
        const user = userEvent.setup();
        montar(['VER_NOMINA']);
        expect(await screen.findByRole('heading', { name: 'Nómina septiembre' })).toBeInTheDocument();
        const general = screen.getByRole('table');
        expect(within(general).getByText(/Pago entre el 6 y el 11/)).toBeInTheDocument();
        expect(within(general).getByText(/Pago el día 20/)).toBeInTheDocument();
        await user.click(within(screen.getByRole('navigation', { name: 'Vistas del cierre' })).getByRole('button', { name: 'Ana Ficticia' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(await screen.findByText('#501')).toBeInTheDocument();
        expect(screen.getByText('Abono menor al 30 %')).toBeInTheDocument();
        expect(screen.getByText('Sin precio de lista')).toBeInTheDocument();
        // Solo consulta: sin campos editables.
        expect(screen.queryByLabelText('Comisión venta 501')).not.toBeInTheDocument();
    });

    it('en borrador se edita en su sitio y se agregan ajustes', async () => {
        const user = userEvent.setup();
        servicio.editarLinea.mockResolvedValue(cierre());
        servicio.agregarAjuste.mockResolvedValue(cierre());
        montar(['VER_NOMINA', 'GESTIONAR_NOMINA']);
        await user.click(within(await screen.findByRole('navigation', { name: 'Vistas del cierre' })).getByRole('button', { name: 'Ana Ficticia' }));
        const lista = await screen.findByLabelText('Precio de lista venta 502');
        await user.type(lista, '250000{Enter}');
        await waitFor(() => expect(servicio.editarLinea).toHaveBeenCalledWith(12, { precio_lista: '250000' }));
        await user.click(screen.getByLabelText('Pagar venta 502'));
        await waitFor(() => expect(servicio.editarLinea).toHaveBeenCalledWith(12, { pagar: true }));
        await user.type(screen.getByLabelText('Descripción del ajuste'), 'Adelanto del 15');
        await user.type(screen.getByLabelText('Valor del ajuste'), '100000');
        await user.click(screen.getByRole('button', { name: 'Restar' }));
        await waitFor(() => expect(servicio.agregarAjuste).toHaveBeenCalledWith(7, { descripcion: 'Adelanto del 15', valor: -100000 }));
    });

    it('el cierre es por asesor: se cierra en su pestaña y se reabre sin justificación', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        servicio.accionAsesor.mockResolvedValueOnce(cierre('cerrado')).mockResolvedValueOnce(cierre());
        montar(['VER_NOMINA', 'GESTIONAR_NOMINA']);
        const general = await screen.findByRole('table');
        expect(within(general).getAllByText('10 %')).toHaveLength(2); // asesor y total
        expect(within(general).queryByText(/Pendiente/)).not.toBeInTheDocument();
        await user.click(within(screen.getByRole('navigation', { name: 'Vistas del cierre' })).getByRole('button', { name: 'Ana Ficticia' }));
        await user.click(await screen.findByRole('button', { name: 'Cerrar nómina de Ana Ficticia' }));
        await waitFor(() => expect(servicio.accionAsesor).toHaveBeenCalledWith(7, 'cerrar'));
        expect(await screen.findByText('Cerrada')).toBeInTheDocument();
        expect(screen.queryByLabelText('Comisión venta 501')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Reabrir' }));
        await waitFor(() => expect(servicio.accionAsesor).toHaveBeenCalledWith(7, 'reabrir'));
        expect(screen.queryByLabelText('Motivo para reabrir')).not.toBeInTheDocument();
    });
});
