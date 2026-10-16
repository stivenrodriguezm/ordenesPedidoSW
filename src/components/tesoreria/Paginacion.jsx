import React from 'react';
import { Button } from '../ui';

export default function Paginacion({ pagina, datos, cambiar, nombre = 'resultados' }) {
    return <nav className="tesoreria-paginacion" aria-label={`Páginas de ${nombre}`}>
        <Button variant="secondary" disabled={!datos?.previous} onClick={() => cambiar(pagina - 1)}>Anterior</Button>
        <span>Página {pagina} · {datos?.count ?? 0} {nombre}</span>
        <Button variant="secondary" disabled={!datos?.next} onClick={() => cambiar(pagina + 1)}>Siguiente</Button>
    </nav>;
}
