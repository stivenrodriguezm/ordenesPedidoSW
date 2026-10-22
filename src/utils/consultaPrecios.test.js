import { describe, expect, it } from 'vitest';
import { buscarCatalogo, decorativosIncluidos, indexarCatalogo, transportesCompartidos, transporteDeItem } from './consultaPrecios';

describe('«Cojines incluidos» en la cotización', () => {
  const sofa = { id: 's', decorativosIncluidos: 2, cantidad: 1, precioUnitario: 3000000 };
  const deco = (id, precioUnitario, topeIncluido, cantidad = 1) => ({ id, esDecorativo: true, precioUnitario, topeIncluido, cantidad });

  it('cubre los 2 de mayor valor, cada uno hasta su precio en grupo 2', () => {
    // Ejemplo del usuario: A $100 (g1), B $150 (g2), C $200 en g4 que en g2 valdría $160.
    const r = decorativosIncluidos([sofa, deco('A', 100000, 100000), deco('B', 150000, 150000), deco('C', 200000, 160000)]);
    expect(r).toEqual({ B: { unidades: 1, valor: 150000 }, C: { unidades: 1, valor: 160000 } });
  });

  it('el cupo depende de la cantidad del producto; sin «Cojines incluidos» no hay cupo', () => {
    expect(decorativosIncluidos([{ ...sofa, cantidad: 2 }, deco('A', 100000, 100000, 3)])).toEqual({ A: { unidades: 3, valor: 300000 } });
    expect(decorativosIncluidos([{ ...sofa, decorativosIncluidos: 0 }, deco('A', 100000, 100000)])).toEqual({});
  });
});

describe('buscador del catálogo', () => {
  const lineas = [
    { id: 1, nombre: 'Sofá Detroit', variantes: [{ id: 11, nombre: '3 puestos', categoria: 1 }] },
    { id: 2, nombre: 'Alaska', variantes: [{ id: 21, nombre: 'Sofá 2p', categoria: 1 }] },
    { id: 3, nombre: 'Comedor Roma', variantes: [{ id: 31, nombre: 'Mesa 6', categoria: 2 }] },
  ];
  const indice = indexarCatalogo(lineas);

  it('sin acentos ni mayúsculas, y primero los nombres que empiezan por lo escrito', () => {
    expect(buscarCatalogo(indice, '', 'sofa').map((l) => l.id)).toEqual([1, 2]);
    expect(buscarCatalogo(indice, '', 'ALASKA 2P').map((l) => l.id)).toEqual([2]);
    expect(buscarCatalogo(indice, 2, '').map((l) => l.id)).toEqual([3]);
  });
});

describe('transporte por envío', () => {
  const silla = { valor: 40000, cupo: 6 };
  it('cada transporte lleva su cupo de unidades; sin cupo, uno por línea', () => {
    expect(transportesCompartidos([{ id: 's', cantidad: 6, transporte: silla }])).toEqual({ s: { transportes: 1, valor: 200000 } });
    expect(transportesCompartidos([{ id: 's', cantidad: 7, transporte: silla }])).toEqual({ s: { transportes: 2, valor: 200000 } });
    expect(transportesCompartidos([{ id: 'm', cantidad: 2, transporte: { valor: 60000, cupo: null } }])).toEqual({ m: { transportes: 1, valor: 60000 } });
    expect(transportesCompartidos([{ id: 'm', cantidad: 1, transporte: { valor: 60000, cupo: null } }])).toEqual({});
  });
  it('las piezas de un conjunto cobran un solo transporte, el mayor; productos distintos el suyo', () => {
    const items = [{ id: 'm', cantidad: 1, conjuntoId: 'c', transporte: { valor: 60000, cupo: null } },
      { id: 's', cantidad: 6, conjuntoId: 'c', transporte: silla }, { id: 'sofa', cantidad: 1, transporte: { valor: 100000, cupo: null } }];
    expect(transportesCompartidos(items)).toEqual({ s: { transportes: 0, valor: 240000 } });
  });
  it('un opcional no elegido no cuenta', () => {
    const variante = { transporte: { id: 9, valor: 40000, cupo: 6, opcional: true } };
    expect(transporteDeItem(variante, [])).toBeNull();
    expect(transporteDeItem(variante, [9])).toEqual({ valor: 40000, cupo: 6 });
  });
});
