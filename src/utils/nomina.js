// Formatos y exportación de Nómina (D12a).
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const cop = (v) => (v == null || v === '' ? '—' : pesos.format(Number(v)));
export const pct = (v) => (v == null || v === '' ? '—' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`);
export const fecha = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO') : '—');

export const ESTADO_VENTA = { pendiente: 'Pendiente', entregado: 'Entregada', anulada: 'Anulada' };

const filaVenta = (l) => ({
    Venta: l.venta, Fecha: fecha(l.fecha_venta), Cliente: l.cliente, Estado: ESTADO_VENTA[l.estado_venta] || l.estado_venta,
    'Precio lista': Number(l.precio_lista || 0) || '', 'Precio venta': Number(l.valor_venta), 'Descuento %': Number(l.descuento_pct || 0),
    Asesores: l.participantes, Base: Number(l.base || 0), '% comisión': Number(l.porcentaje || 0), Comisión: Number(l.valor),
    'Abono %': Number(l.abono_pct || 0), 'Se paga': l.pagar ? 'Sí' : `No — ${l.motivo_pendiente}`, Nota: l.nota,
});

// Libro con el cierre general y una hoja por asesor, como el cierre que se entrega cada mes.
export async function exportarCierre(cierre) {
    const XLSX = await import('xlsx');
    const libro = XLSX.utils.book_new();
    const general = cierre.asesores.map(a => ({
        Asesor: a.nombre, Estado: a.estado === 'cerrado' ? 'Cerrada' : 'Abierta', Ventas: Number(a.ventas_periodo),
        '% Dcto. global': a.totales.descuento_global_pct == null ? '' : Number(a.totales.descuento_global_pct),
        Comisiones: Number(a.totales.comisiones), Bonificaciones: Number(a.totales.bonificaciones),
        [`Básico (día ${cierre.dia_pago_basico})`]: Number(a.totales.salario_basico),
        [`Total nómina (${cierre.pago_nomina})`]: Number(a.totales.total_nomina),
    }));
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(general), 'Cierre general');
    const usados = new Set(['Cierre general']);
    cierre.asesores.forEach(a => {
        const filas = [
            ...a.lineas.filter(l => l.tipo === 'comision').map(filaVenta),
            ...a.lineas.filter(l => l.tipo === 'bonificacion').map(l => ({ ...filaVenta(l), '% comisión': '', Comisión: '',
                Bonificación: Number(l.valor), 'Causada en': l.causada_en?.nombre || '' })),
            ...a.lineas.filter(l => l.tipo === 'ajuste').map(l => ({ Cliente: `Ajuste: ${l.cliente}`, Comisión: Number(l.valor) })),
        ];
        let nombre = (a.nombre || 'Asesor').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Asesor';
        while (usados.has(nombre)) nombre = `${nombre.slice(0, 26)}_${usados.size}`;
        usados.add(nombre);
        XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas.length ? filas : [{ Cliente: 'Sin movimientos' }]), nombre);
    });
    XLSX.writeFile(libro, `${cierre.nombre.replace(/[^\w\d\- ]+/g, '').trim() || 'Nomina'}.xlsx`);
}
