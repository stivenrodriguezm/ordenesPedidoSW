import { describe, expect, it } from 'vitest';
import { agruparSubcategorias, idsMismoNombre } from './subcategorias';

// Cada referencia tiene su propia «Silla» (2026-11-10): en listas y filtros van una sola vez.
const lista = [
    { id: 1, nombre: 'Silla', categoria: 7 },
    { id: 2, nombre: 'silla ', categoria: 7 },
    { id: 3, nombre: 'Sillá', categoria: 7 },
    { id: 4, nombre: 'Silla', categoria: 8 },
    { id: 5, nombre: 'Mesa', categoria: 7 },
];

describe('subcategorías por nombre', () => {
    it('agrupa por nombre (sin tildes ni mayúsculas) y categoría, y conserva la elegida como valor', () => {
        const grupos = agruparSubcategorias(lista);
        expect(grupos.map((g) => [g.id, g.ids])).toEqual([[1, [1, 2, 3]], [4, [4]], [5, [5]]]);
        expect(agruparSubcategorias(lista, ['2'])[0]).toMatchObject({ id: 2, ids: [1, 2, 3] });
    });

    it('un filtro por una incluye todas las del mismo nombre', () => {
        expect(idsMismoNombre(lista, '3')).toEqual(new Set(['1', '2', '3']));
        expect(idsMismoNombre(lista, '')).toEqual(new Set());
    });
});
