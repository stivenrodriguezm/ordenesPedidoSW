// Constantes y formatos compartidos del módulo de Remisiones
// (formulario de creación, listado, edición e imprimible).
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate, getTodayStr } from './dates';

export const ESTADOS_REMISION = {
    creada: { label: 'Por despachar', tone: 'info' },
    despachada: { label: 'En ruta', tone: 'warning' },
    finalizada: { label: 'Entregada', tone: 'success' },
    devuelta: { label: 'Devuelta', tone: 'neutral' },
    anulada: { label: 'Anulada', tone: 'danger' },
};

export const ESTADOS_ACTIVOS = ['creada', 'despachada'];

// Solo efectivo u otro. Con "otro" se guarda lo que escribe el vendedor
// (p. ej. "Transferencia a Bancolombia"), que es lo que sale impreso.
export const METODOS_PAGO = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'otro', label: 'Otro' },
];

// Valores de remisiones anteriores que ya no se ofrecen.
const METODOS_ANTERIORES = { transferencia: 'Transferencia', datafono: 'Datáfono', pagado: 'Pagado' };

export const metodoPagoLabel = value => (
    METODOS_PAGO.find(m => m.value === value)?.label || METODOS_ANTERIORES[value] || value || ''
);

/** Valor guardado → opción del formulario y texto de "otro". */
export function metodoPagoAForm(value) {
    if (!value) return { metodo: '', otro: '' };
    if (value === 'efectivo') return { metodo: 'efectivo', otro: '' };
    return { metodo: 'otro', otro: value === 'otro' ? '' : metodoPagoLabel(value) };
}

/** Opción del formulario → valor a guardar. */
export const metodoPagoAApi = (metodo, otro) => (metodo === 'otro' ? (otro || '').trim() : metodo || '');

export const FRANJAS = [
    { key: 'manana', label: 'Mañana', desde: '08:00', hasta: '12:00' },
    { key: 'tarde', label: 'Tarde', desde: '12:00', hasta: '18:00' },
    { key: 'dia', label: 'Todo el día', desde: '08:00', hasta: '18:00' },
];

export function fmtHora(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
}

export function fmtFranja(desde, hasta) {
    if (!desde && !hasta) return '';
    if (!hasta) return `desde ${fmtHora(desde)}`;
    return `${fmtHora(desde)} – ${fmtHora(hasta)}`;
}

const capitalizar = txt => txt.charAt(0).toUpperCase() + txt.slice(1);

/** Franja compacta para listados: '8–12 a. m.', '12–6 p. m.', '8 a. m.–6 p. m.' */
export function fmtFranjaCorta(desde, hasta) {
    const partes = t => {
        if (!t) return null;
        const [h, m] = t.split(':').map(Number);
        return { txt: `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}`, suf: h >= 12 ? 'p. m.' : 'a. m.' };
    };
    const a = partes(desde);
    const b = partes(hasta);
    if (!a && !b) return '';
    if (!b) return `desde ${a.txt} ${a.suf}`;
    if (!a) return `hasta ${b.txt} ${b.suf}`;
    return a.suf === b.suf ? `${a.txt}–${b.txt} ${b.suf}` : `${a.txt} ${a.suf}–${b.txt} ${b.suf}`;
}

/** 'YYYY-MM-DD' → 'Sábado 27 de septiembre' */
export function fmtFechaLarga(iso, conAnio = false) {
    const d = parseLocalDate(iso);
    if (!d) return '';
    return capitalizar(format(d, conAnio ? "EEEE d 'de' MMMM 'de' yyyy" : "EEEE d 'de' MMMM", { locale: es }));
}

/** 'YYYY-MM-DD' → 'Sáb 27 sep' */
export function fmtFechaCorta(iso) {
    const d = parseLocalDate(iso);
    if (!d) return '';
    return capitalizar(format(d, 'EEE d MMM', { locale: es }).replace('.', ''));
}

/** Etiqueta relativa para la fecha de entrega: 'Hoy', 'Mañana', 'Atrasada' o null. */
export function fechaRelativa(iso, estado) {
    if (!iso) return null;
    const hoy = getTodayStr();
    if (iso === hoy) return 'hoy';
    const manana = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    if (iso === manana) return 'manana';
    if (iso < hoy && ESTADOS_ACTIVOS.includes(estado)) return 'atrasada';
    return null;
}

export const numeroRemision = id => String(id ?? '').padStart(5, '0');

/** Unidades totales (inventario = 1 c/u, manuales con su cantidad). */
export function totalUnidades(rem) {
    const inv = rem?.inventario_items_detalle?.length || 0;
    const man = (rem?.items_manuales || []).reduce((s, m) => s + (Number(m.cantidad) || 1), 0);
    return inv + man;
}

/** Texto del inventario para el cliente (variación y observación). */
export const descripcionInventario = i => [i.variacion, i.observacion].filter(Boolean).join(' — ');

/**
 * Productos de la remisión en un formato común para el imprimible y el detalle:
 * categoría, subcategoría, referencia, cantidad, descripción y tapizado. Los de inventario van
 * agrupados por juego y traen su código; los de pedido o escritos a mano, su texto.
 */
export function lineasProductos(rem) {
    const grupos = new Map();
    const sueltos = [];
    (rem?.inventario_items_detalle || []).forEach(i => {
        if (i.grupo_id) {
            if (!grupos.has(i.grupo_id)) grupos.set(i.grupo_id, { nombre: i.grupo_nombre, observacion: i.grupo_observacion, items: [] });
            grupos.get(i.grupo_id).items.push(i);
        } else {
            sueltos.push(i);
        }
    });
    const deInventario = (i, anidado = false) => ({
        tipo: 'item',
        key: i.id_referencia,
        cantidad: 1,
        categoria: i.categoria_nombre || '',
        subcategoria: i.subcategoria_nombre || '',
        referencia: i.producto_nombre || '',
        descripcion: i.descripcion_remision || descripcionInventario(i),
        tela: i.tela_remision || '',
        codigo: i.id_referencia,
        anidado,
    });

    const filas = [];
    grupos.forEach((g, id) => {
        filas.push({ tipo: 'grupo', key: `g-${id}`, nombre: g.nombre, observacion: g.observacion, piezas: g.items.length });
        g.items.forEach(i => filas.push(deInventario(i, true)));
    });
    sueltos.forEach(i => filas.push(deInventario(i)));
    (rem?.items_manuales || []).forEach(m => filas.push({
        tipo: 'item',
        key: `m-${m.id}`,
        cantidad: m.cantidad,
        categoria: m.categoria_nombre || '',
        subcategoria: m.subcategoria_nombre || '',
        referencia: m.referencia || '',
        descripcion: m.descripcion || '',
        tela: m.tela || '',
        codigo: '',
    }));
    return filas;
}

/**
 * Productos iguales en una sola fila con su cantidad (2026-10-27): 6 sillas = «6 · Silla», no 6
 * renglones. Iguales = misma categoría, subcategoría, referencia, descripción y tapizado, dentro
 * del mismo juego. Las unidades de inventario conservan sus códigos en `codigos`.
 */
export function agruparFilas(filas) {
    const salida = [];
    let vistas = new Map();
    filas.forEach(f => {
        if (f.tipo === 'grupo') {
            salida.push(f);
            vistas = new Map();
            return;
        }
        const clave = [f.anidado ? 'juego' : 'suelto', f.categoria, f.subcategoria, f.referencia, f.descripcion, f.tela].join('\u0001');
        const previa = vistas.get(clave);
        if (previa) {
            previa.cantidad += Number(f.cantidad) || 1;
            if (f.codigo) previa.codigos.push(f.codigo);
            return;
        }
        const fila = { ...f, cantidad: Number(f.cantidad) || 1, codigos: f.codigo ? [f.codigo] : [] };
        vistas.set(clave, fila);
        salida.push(fila);
    });
    return salida;
}

/** Nombre del transportador asignado (usuario interno o externo), '' si no hay. */
export const nombreTransportador = rem => rem?.transportador_usuario_nombre || rem?.transportador || '';

/** Número de celular colombiano para enlaces de WhatsApp (57 + 10 dígitos). */
export function whatsappNumero(tel) {
    const digits = String(tel || '').replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
    if (digits.length === 12 && digits.startsWith('573')) return digits;
    return null;
}

export const MOTIVOS_NO_ENTREGA = {
    faltante: 'No iba en el viaje',
    rechazado: 'El cliente no lo recibió',
    danado: 'Llegó con daño',
    otro: 'Otro',
};

// Productos de la remisión con la clave con que el servidor los identifica (P11-03).
export function productosDeRemision(remision) {
    const inv = (remision?.inventario_items_detalle || []).map(i => ({
        clave: `i-${i.id_referencia}`, tipo: 'inventario', id: i.id_referencia, cantidad: 1,
        nombre: `${i.producto_nombre || 'Producto'} · ${i.id_referencia}`,
    }));
    const man = (remision?.items_manuales || []).map(m => ({
        clave: `m-${m.id}`, tipo: 'item_manual', id: m.id, cantidad: m.cantidad || 1,
        nombre: `${m.cantidad} × ${m.referencia || m.subcategoria_nombre || (m.descripcion || '').slice(0, 40) || 'Producto'}`,
    }));
    return [...inv, ...man];
}

// Unidad de la remisión a la que corresponde un código leído: contenido del QR
// (uuid o 'item-<id>') o el código escrito. null si no va en esta remisión (P11-05).
export function unidadDeCodigo(codigo, remision) {
    const c = String(codigo || '').trim().toLowerCase();
    if (!c) return null;
    const id = c.startsWith('item-') ? c.slice(5) : c;
    return (remision?.inventario_items_detalle || []).find(i =>
        (i.qr_uuid && i.qr_uuid.toLowerCase() === c) || String(i.id_referencia).toLowerCase() === id) || null;
}
