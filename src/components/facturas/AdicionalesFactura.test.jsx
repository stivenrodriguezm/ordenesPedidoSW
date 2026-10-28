import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdicionalesFactura from './AdicionalesFactura';
import { netoAdicionales } from '../../utils/adicionalesFactura';

function Prueba({ onCambio }) {
    const [ajustes, setAjustes] = useState([]);
    return <AdicionalesFactura ajustes={ajustes} formatear={n => `$${n}`} onChange={a => { setAjustes(a); onCambio(a); }} />;
}

describe('Adicionales de la factura', () => {
    it('agrega uno que suma y otro que resta; rechaza centavos sin truncarlos', () => {
        let ultimo = [];
        render(<Prueba onCambio={a => { ultimo = a; }} />);
        fireEvent.click(screen.getByRole('button', { name: /Agregar adicional/ }));
        fireEvent.change(screen.getByLabelText('Concepto del adicional 1'), { target: { value: 'Transporte' } });
        const valor = screen.getByLabelText('Valor del adicional 1');
        fireEvent.change(valor, { target: { value: '50.000,50' } });
        fireEvent.blur(valor);
        expect(screen.getByRole('alert')).toHaveTextContent('sin centavos');
        fireEvent.change(valor, { target: { value: '50.000' } });
        fireEvent.blur(valor);
        expect(valor).toHaveValue('$50.000');
        fireEvent.click(screen.getByRole('button', { name: /Agregar adicional/ }));
        fireEvent.change(screen.getByLabelText('Concepto del adicional 2'), { target: { value: 'Descuento' } });
        fireEvent.click(screen.getAllByRole('radio', { name: /Resta/ })[1]);
        fireEvent.change(screen.getByLabelText('Valor del adicional 2'), { target: { value: '20000' } });
        fireEvent.blur(screen.getByLabelText('Valor del adicional 2'));
        expect(ultimo.map(a => [a.concepto, a.tipo, a.valor])).toEqual([['Transporte', 'suma', '50000'], ['Descuento', 'resta', '20000']]);
        expect(netoAdicionales(ultimo)).toBe(30000);
        expect(screen.getByText('+$30000')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Quitar el adicional 1' }));
        expect(netoAdicionales(ultimo)).toBe(-20000);
    });
});
