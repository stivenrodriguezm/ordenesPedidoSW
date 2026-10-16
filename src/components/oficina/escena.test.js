import { describe, expect, it } from 'vitest';
import { nombreCorto, ubicarEtiquetas } from './etiquetasOficina';
import { lugaresSociales, ruta } from './paseos';
import { pasillos } from './distribucionOficina';

describe('Etiquetas del plano', () => {
    it('acorta nombres largos y conserva los cortos', () => {
        expect(nombreCorto('Sebastian Albarracin')).toBe('Sebastian A.');
        expect(nombreCorto('IA Lottus')).toBe('IA Lottus');
        expect(nombreCorto('Coach de asesores')).toBe('Coach D.');
    });
    it('mueve la etiqueta que chocaría con otra cercana', () => {
        const r = ubicarEtiquetas([{ clave: 'a', px: 800, py: 400, texto: 'Miguel Varela' }, { clave: 'b', px: 815, py: 405, texto: 'Tatiana Mora' }]);
        expect(r.a).not.toEqual(r.b); // no quedan en el mismo sitio
        expect(Object.keys(r)).toEqual(['a', 'b']);
    });
});

describe('Paseos por la oficina', () => {
    it('camina por los pasillos y llega al destino', () => {
        const desde = { x: 900, y: 300 }, hasta = lugaresSociales({ x: 400, y: 330 })[0];
        const puntos = ruta(desde, hasta);
        expect(puntos[0]).toEqual(desde);
        expect(puntos.at(-1)).toEqual(hasta);
        const cx = pasillos[0].x + pasillos[0].w / 2, hy = pasillos[1].y + pasillos[1].h / 2;
        expect(puntos).toContainEqual({ x: cx, y: hy }); // cruza por la intersección de pasillos
    });
});
