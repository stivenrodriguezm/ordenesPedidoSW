import React, { useId } from 'react';

export default function TipoPersonaSelect({ value = 'natural', onChange, className = 'ds-input', disabled = false }) {
    const id = useId();
    return <>
        <label htmlFor={id}>Tipo de persona</label>
        <select id={id} name="tipo_persona" className={className} value={value} onChange={onChange} disabled={disabled} required>
            <option value="natural">Persona natural</option>
            <option value="juridica">Persona jurídica</option>
        </select>
    </>;
}
