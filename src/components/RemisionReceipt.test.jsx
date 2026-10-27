import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RemisionReceipt from './RemisionReceipt';
import { agruparFilas, lineasProductos } from '../utils/remisiones';

const silla = (id) => ({ id_referencia: id, producto_nombre: 'Valencia', categoria_nombre: 'Comedor', subcategoria_nombre: 'Silla', variacion: '', observacion: '', tela_remision: 'Lino arena' });
const remision = {
  id: 42, estado: 'creada', cliente_nombre: 'Cliente ficticio', transportador: 'Transportes Ficticios',
  inventario_items_detalle: [silla('S-1'), silla('S-2'), silla('S-3'), { ...silla('S-4'), tela_remision: 'Cuero miel' }],
  items_manuales: [{ id: 7, cantidad: 2, categoria_nombre: 'Comedor', subcategoria_nombre: 'Silla', referencia: 'Valencia', descripcion: '', tela: 'Lino arena' },
    { id: 8, cantidad: 1, categoria_nombre: 'Comedor', subcategoria_nombre: 'Mesa', referencia: 'Valencia', descripcion: '', tela: '' }],
};

describe('Remisión: productos agrupados y firmas de despacho (2026-10-27)', () => {
  it('une los productos iguales en una fila con su cantidad y conserva los códigos', () => {
    const filas = agruparFilas(lineasProductos(remision));
    expect(filas.map(f => [f.cantidad, f.subcategoria, f.tela])).toEqual([[5, 'Silla', 'Lino arena'], [1, 'Silla', 'Cuero miel'], [1, 'Mesa', '']]);
    expect(filas[0].codigos).toEqual(['S-1', 'S-2', 'S-3']);
  });

  it('el imprimible muestra una fila por producto y los espacios para quien despacha y el transportador', () => {
    render(<RemisionReceipt remision={remision} />);
    const filas = screen.getAllByRole('row').slice(1);
    expect(filas).toHaveLength(3);
    expect(within(filas[0]).getByText('5')).toBeInTheDocument();
    expect(within(filas[0]).getByText('S-1, S-2, S-3')).toBeInTheDocument();
    expect(screen.getByText('Nombre de quien despacha')).toBeInTheDocument();
    expect(screen.getByText('Firma del transportador · Transportes Ficticios')).toBeInTheDocument();
    expect(screen.getByText('Recibí a satisfacción')).toBeInTheDocument();
  });
});
