import { describe, expect, it } from 'vitest';
import { leerPesos, mostrarPesosAPI, validarPesos } from './pesos';

describe('Importes bancarios en pesos', () => {
    it.each([['$3.000.000', 3000000], ['3.000.000', 3000000], ['3000000', 3000000], ['$0', 0]])('interpreta %s sin confundir miles y decimales', (s,n) => expect(leerPesos(s)).toBe(n));
    it.each(['', ' ', '3.00', '3,50', '3000000.00', '-100', 'NaN', '1e6', '100000000', '3.000 pesos'])('rechaza %s sin convertirlo en cero ni truncarlo', s => {
        expect(leerPesos(s)).toBe(null); expect(() => validarPesos(s)).toThrow();
    });
    it('distingue el decimal del servidor del texto escrito', () => {
        expect(mostrarPesosAPI('3000000.00')).toBe('$3.000.000');
        expect(validarPesos('$3.000.000')).toBe('3000000');
    });
});
