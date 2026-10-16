import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Markdown from './Markdown';

describe('Markdown de las respuestas del asistente', () => {
    it('muestra títulos, negritas, listas y tablas', () => {
        const texto = '### Conclusión\nVamos **bien** este mes.\n\n- Uno\n- Dos\n\n1. Primero\n2. Segundo\n\n| Asesor | Ventas |\n| :--- | ---: |\n| Ana | $1.000 |\n| Luis | $2.000 |';
        const { container } = render(<Markdown texto={texto} />);
        expect(screen.getByRole('heading', { name: 'Conclusión' })).toBeInTheDocument();
        expect(screen.getByText('bien').tagName).toBe('STRONG');
        expect(container.querySelectorAll('ul li')).toHaveLength(2);
        expect(container.querySelectorAll('ol li')).toHaveLength(2);
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: '$2.000' })).toHaveStyle({ textAlign: 'right' });
    });

    it('anida las viñetas con sangría bajo su punto numerado sin renumerar', () => {
        const texto = '1. **Cobrar cartera**\n   * Qué hacer: llamar\n   * Quién: auxiliar\n2. **Pedidos**\n   * Qué hacer: revisar';
        const { container } = render(<Markdown texto={texto} />);
        expect(container.querySelectorAll('ol > li')).toHaveLength(2);
        expect(container.querySelectorAll('ol > li:first-child > ul > li')).toHaveLength(2);
        expect(screen.getByText('Quién: auxiliar')).toBeInTheDocument();
    });

    it('no interpreta HTML del texto', () => {
        const { container } = render(<Markdown texto={'<img src=x onerror="alert(1)"> **hola**'} />);
        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
    });
});
