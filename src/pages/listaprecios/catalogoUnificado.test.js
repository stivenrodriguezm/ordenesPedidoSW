import { describe, expect, it } from 'vitest';
import { buscarCatalogo, indexarCatalogo } from '../../utils/consultaPrecios';
import { subcategoriasCatalogo, unificarCatalogo } from './catalogoUnificado';

const lista = (id, proveedor, subcategoria, nombre, costo) => ({ id, referencia: id + 100, nombre: 'Valencia', proveedor, proveedor_nombre: `Proveedor ${proveedor}`, fotos: [`foto-${id}`], notas: `Nota ${id}`,
  disposicion: { orden: [22, 11] }, variantes: [{ id: id * 10, subcategoria, nombre, precios: [{ grupo: null, precio: costo }], notas: [] }] });

describe('Referencia comercial única en consulta', () => {
  it('reúne nombres equivalentes, mantiene el orden común y el origen exacto de cada precio', () => {
    const originales = [lista(1, 1, 11, 'Mesa', 300000), { ...lista(2, 2, 22, 'Silla', 100000), nombre: '  valéncia  ' }];
    const [valencia] = unificarCatalogo(originales);
    expect(unificarCatalogo(originales)).toHaveLength(1);
    expect(valencia.proveedor_nombre).toBe('2 proveedores');
    expect(valencia.variantes.map(v => v.nombre)).toEqual(['Silla', 'Mesa']);
    expect(valencia.variantes[0]).toMatchObject({ id: 20, precios: [{ precio: 100000 }], origen: { lineaId: 2, referenciaId: 102, fotos: ['foto-2'], notas: 'Nota 2' } });
    expect(originales[0].variantes[0]).not.toHaveProperty('origen');
  });

  it('una subcategoría de varios proveedores conserva todas sus fichas sin duplicar la opción', () => {
    const [valencia] = unificarCatalogo([lista(1, 1, 11, 'Mesa', 300000), lista(2, 2, 11, 'Mesa', 400000)]);
    const subs = subcategoriasCatalogo(valencia.variantes);
    expect(subs).toHaveLength(1);
    expect(subs[0].variantes.map(v => [v.id, v.origen.referenciaId, v.precios[0].precio])).toEqual([[10, 101, 300000], [20, 102, 400000]]);
  });

  it('atribuye la referencia a un proveedor común y los conjuntos a los proveedores reales de las piezas', () => {
    expect(unificarCatalogo([lista(1, 7, 11, 'Mesa', 300000), lista(2, 7, 22, 'Silla', 100000)])[0].proveedor_nombre).toBe('Proveedor 7');
    const alojada = lista(3, 99, 33, 'Comedor', 900000);
    alojada.variantes[0].proveedores = [{ id: 7, nombre: 'Proveedor 7' }, { id: 8, nombre: 'Proveedor 8' }];
    const [valencia] = unificarCatalogo([alojada]);
    expect(valencia.proveedores.map(p => p.id)).toEqual([7, 8]);
    expect(valencia.proveedor_nombre).toBe('2 proveedores');
    expect(buscarCatalogo(indexarCatalogo([valencia]), '', 'proveedor 99')).toHaveLength(0);
  });

  it('buscar un proveedor encuentra su subcategoría sin atribuirle los precios de los demás', () => {
    const unificadas = unificarCatalogo([lista(1, 1, 11, 'Mesa', 300000), lista(2, 2, 22, 'Silla', 100000)]);
    const resultado = buscarCatalogo(indexarCatalogo(unificadas), '', 'valencia proveedor 2');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].variantes.map(v => v.id)).toEqual([20]);
  });
});
