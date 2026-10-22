import { describe, expect, it } from 'vitest';
import { etiquetaProveedor, proveedorInicial, subcategoriasReferencia } from './subcategoriasReferencia';

const mesa = { id: 1, nombre: 'Mesa', categoria: 1, categoria_nombre: 'Comedor' };
const silla = { ...mesa, id: 2, nombre: 'Silla' };
const norte = { id: 10, proveedor: 100, proveedor_nombre: 'Norte', subcategorias: [mesa, silla] };
const sur = { id: 11, proveedor: 101, proveedor_nombre: 'Sur', subcategorias: [silla] };

describe('Subcategorías unificadas con proveedor por fila', () => {
  it('muestra la unión de tipos sin duplicarlos ni mezclar registros de proveedores', () => {
    const filas = subcategoriasReferencia([norte, sur]);
    expect(filas.map(f => f.nombre)).toEqual(['Mesa', 'Silla']);
    expect(filas.map(f => f.referencias.map(r => r.id))).toEqual([[10], [10, 11]]);
  });
  it('nombres iguales de categorías diferentes conservan identidad independiente', () => {
    expect(subcategoriasReferencia([norte, { ...sur, subcategorias: [{ ...mesa, id: 3, categoria: 2 }] }])).toHaveLength(3);
  });
  it('no adivina proveedor cuando hay varias opciones; recuerda una elección válida', () => {
    const fila = subcategoriasReferencia([norte, sur])[1];
    expect(proveedorInicial(fila)).toBe('');
    expect(proveedorInicial(fila, 11)).toBe(11);
    expect(proveedorInicial(fila, 50)).toBe('');
    expect(proveedorInicial(fila, '')).toBe('');
  });
  it('elige la única configuración con costo confirmado y distingue referencias duplicadas', () => {
    const fila = subcategoriasReferencia([norte, { ...sur, linea: { variantes: [{ subcategoria: 2, costo_confirmado: true }] } }])[1];
    expect(proveedorInicial(fila)).toBe(11);
    expect(etiquetaProveedor(norte, [norte, { ...norte, id: 12 }])).toBe('Norte · Ref. #10');
  });
});
