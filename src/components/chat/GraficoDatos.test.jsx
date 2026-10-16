import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GraficoDatos from './GraficoDatos';
vi.mock('react-chartjs-2', () => ({ Bar: () => <canvas aria-label="Barras" />, Line: () => <canvas />, Doughnut: () => <canvas /> }));
const grafico = { tipo: 'barras', titulo: 'Ventas', fuente: 'ventas', unidad: 'COP', etiquetas: ['Sede 1', 'Sede 2'], valores: [1234.5, null], filtros: { desde: '2026-09-01' }, nota: 'Solo confirmadas.' };
describe('Gráficos del asistente', () => {
    it('muestra tabla accesible, origen, filtro y dato faltante sin convertirlo en cero', () => {
        render(<GraficoDatos grafico={grafico} />);
        fireEvent.click(screen.getByText('Ver datos del gráfico'));
        expect(screen.getByRole('table')).toHaveTextContent('Sede 1');
        expect(screen.getByRole('table')).toHaveTextContent('1.234,5');
        expect(screen.getByText('Sin dato')).toBeInTheDocument();
        expect(screen.getByText('desde: 2026-09-01')).toBeInTheDocument();
        expect(screen.getByText('Solo confirmadas.')).toBeInTheDocument();
    });
    it('rechaza series inconsistentes', () => {
        const { container } = render(<GraficoDatos grafico={{ ...grafico, valores: [1] }} />);
        expect(container).toBeEmptyDOMElement();
    });
});
