// Etiquetas de inventario compartidas (P11-02).
export const DISPONIBILIDAD_LABELS = {
    exhibicion: 'Exhibición',
    cliente: 'Cliente',
    por_despachar: 'Por Despachar',
    despachado: 'Despachado',
    entregado: 'Entregado',
    por_reparar: 'Por Reparar',
    consignacion: 'Consignación',
    no_venta: 'No a la venta',
    devuelto_proveedor: 'Devuelto al proveedor',
};

const ESTADO_FISICO_LABELS = { buen_estado: 'Buen estado', por_reparar: 'Por reparar', por_modificar: 'Por modificar', nuevo: 'Nuevo' };

// Texto legible de un cambio registrado en un movimiento: "Disponibilidad: Cliente → Entregado".
export function describirCambios(antes = {}, despues = {}, zonas = []) {
    const zona = id => (id ? (zonas.find(z => String(z.id) === String(id))?.nombre || `Zona #${id}`) : 'sin zona');
    const valor = (campo, v) => {
        if (campo === 'disponibilidad') return DISPONIBILIDAD_LABELS[v] || v || '—';
        if (campo === 'estado_fisico') return ESTADO_FISICO_LABELS[v] || v || '—';
        if (campo === 'zona') return zona(v);
        if (campo === 'venta') return v ? `Venta #${v}` : 'sin venta';
        return String(v ?? '—');
    };
    const nombres = { disponibilidad: 'Disponibilidad', zona: 'Zona', estado_fisico: 'Estado físico', venta: 'Venta' };
    return Object.keys(despues).map(c => (c in antes
        ? `${nombres[c] || c}: ${valor(c, antes[c])} → ${valor(c, despues[c])}`
        : `${nombres[c] || c}: ${valor(c, despues[c])}`));
}
