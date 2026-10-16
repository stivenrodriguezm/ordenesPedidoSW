import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EditorTextoFormato from './EditorTextoFormato';
import { formatoLottus } from '../utils/textoFormato';
function Formulario() {
    const [valor, setValor] = useState('Roble');
    return <EditorTextoFormato id="material" etiqueta="Materiales" valor={valor} alCambiar={setValor} />;
}
describe('Ficha con formato', () => {
    it('formatea una selección y permite previsualizar sin perder el texto', () => {
        render(<Formulario />);
        const input = screen.getByLabelText('Materiales');
        input.setSelectionRange(0, 5);
        fireEvent.click(screen.getByRole('button', { name: 'Negrilla' }));
        expect(input).toHaveValue('**Roble**');
        fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }));
        expect(screen.getByText('Roble').tagName).toBe('STRONG');
        fireEvent.click(screen.getByRole('button', { name: 'Editar', exact: true }));
        expect(screen.getByLabelText('Materiales')).toHaveValue('**Roble**');
    });
    it('escapa HTML y conserva listas, separadores y párrafos', () => {
        const html = formatoLottus('## Diseño\n\n- **Roble**\n- <script>alert(1)</script>\n\n---\n\n1. Cuidar');
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain('<strong>Roble</strong>');
        expect(html).toContain('<ul>'); expect(html).toContain('<ol>'); expect(html).toContain('<hr>');
    });
});
