/**
 * generateRemisionPDF — LOTTUS
 * PDF membretado de remisión. Tamaño carta, colores corporativos negro.
 */
import { jsPDF } from 'jspdf';

// ─── Constantes ───────────────────────────────────────────────────────────────
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN_X = 14;
const MARGIN_Y = 14;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const C = {
    black: [0, 0, 0],
    darkGray: [30, 30, 30],
    midGray: [80, 80, 80],
    lightGray: [150, 150, 150],
    veryLight: [220, 220, 220],
    ultraLight: [242, 242, 242],
    white: [255, 255, 255],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dtStr) {
    if (!dtStr) return '—';
    const clean = dtStr.includes('T') ? dtStr.split('T')[0] : dtStr;
    const parts = clean.split('-');
    if (parts.length !== 3) return clean;
    const [y, m, d] = parts;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthStr = months[parseInt(m, 10) - 1];
    return `${d}/${monthStr}/${y}`;
}

function formatTime12h(timeStr) {
    if (!timeStr || timeStr === '—') return '—';
    let [h, m] = timeStr.split(':');
    let hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${m} ${suffix}`;
}

function formatCOPLocal(val) {
    const num = parseFloat(val);
    if (!val || isNaN(num)) return '—';
    return '$' + Math.round(num).toLocaleString('es-CO');
}

function fillRect(doc, x, y, w, h, rgb) {
    doc.setFillColor(...rgb);
    doc.rect(x, y, w, h, 'F');
}

function strokeRect(doc, x, y, w, h, rgb, lw = 0.3) {
    doc.setDrawColor(...rgb);
    doc.setLineWidth(lw);
    doc.rect(x, y, w, h, 'S');
}

function hLine(doc, x, y, w, rgb, lw = 0.25) {
    doc.setDrawColor(...rgb);
    doc.setLineWidth(lw);
    doc.line(x, y, x + w, y);
}

// ─── Logo Audiowide via Canvas ────────────────────────────────────────────────
function createLogoDataUrl(logoWmm, logoHmm) {
    const PX_PER_MM = 4;
    const RETINA = 3;
    const W = logoWmm * PX_PER_MM;
    const H = logoHmm * PX_PER_MM;
    const canvas = document.createElement('canvas');
    canvas.width = W * RETINA;
    canvas.height = H * RETINA;
    const ctx = canvas.getContext('2d');
    ctx.scale(RETINA, RETINA);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    const fontSize = H * 0.44;
    ctx.font = `${fontSize}px "Audiowide", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LOTTUS', W / 2, H / 2);
    return canvas.toDataURL('image/png');
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function drawHeader(doc) {
    // Logo +20 % más ancho: 52 → 62 mm
    const logoW = 62;
    const logoH = 20;
    const logoX = MARGIN_X;
    const logoY = MARGIN_Y;

    try {
        const logoDataUrl = createLogoDataUrl(logoW, logoH);
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
    } catch (_) {
        fillRect(doc, logoX, logoY, logoW, logoH, C.black);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...C.white);
        doc.text('LOTTUS', logoX + logoW / 2, logoY + logoH / 2 + 2.8, { align: 'center' });
    }

    // Datos empresa
    const rx = MARGIN_X + logoW + 10;
    const ry = logoY + 1;
    const lines = [
        { text: 'LOTTUS MUEBLES S.A.S.', bold: true, size: 7.5 },
        { text: 'NIT: 901.576.093-5', bold: false, size: 6.8 },
        { text: 'Bogotá D.C., Colombia', bold: false, size: 6.8 },
        { text: 'Tel: (601) 761-9348', bold: false, size: 6.8 },
        { text: 'www.muebleslottus.com', bold: false, size: 6.8 },
    ];
    lines.forEach((line, i) => {
        doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
        doc.setFontSize(line.size);
        doc.setTextColor(...(line.bold ? C.black : C.midGray));
        doc.text(line.text, rx, ry + i * 4.4);
    });

    const separatorY = logoY + logoH + 7;
    fillRect(doc, MARGIN_X, separatorY, CONTENT_W, 0.7, C.black);
    return separatorY + 5;
}

// ─── TÍTULO ───────────────────────────────────────────────────────────────────
function drawDocTitle(doc, remision, startY) {
    let y = startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.black);
    doc.text('REMISIÓN DE ENTREGA', MARGIN_X, y);

    const badgeW = 54;
    const badgeH = 11;
    const badgeX = PAGE_W - MARGIN_X - badgeW;
    const badgeY = y - 7;
    fillRect(doc, badgeX, badgeY, badgeW, badgeH, C.black);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.white);
    doc.text(`N° ${String(remision.id).padStart(5, '0')}`, badgeX + badgeW / 2, badgeY + 7, { align: 'center' });

    y += 5;
    hLine(doc, MARGIN_X, y, CONTENT_W, C.veryLight, 0.2);
    y += 5;
    return y;
}

// ─── GRILLA DE DATOS ──────────────────────────────────────────────────────────
function drawInfoGrid(doc, remision, startY) {
    let y = startY;

    const colGap = 4;
    const col1W = (CONTENT_W - colGap * 2) / 3;

    const ESTADO_LABELS = {
        creada: 'Creada', despachada: 'Despachada',
        finalizada: 'Finalizada', anulada: 'Anulada', devuelta: 'Devuelta',
    };
    const METODOS_PAGO_MAP = {
        efectivo: 'Efectivo', transferencia: 'Transferencia',
        datafono: 'Datáfono', pagado: 'Pagado', otro: 'Otro',
    };

    const saldoValue = (remision.sin_saldo || remision.sinSaldo)
        ? 'Sin saldo'
        : formatCOPLocal(remision.saldo);

    // Teléfonos: formato "Tel1 / Tel2"
    const tel1 = remision.telefono_1 || remision.telefono1 || remision.telefono || remision.cliente_telefono1 || '';
    const tel2 = remision.telefono_2 || remision.telefono2 || remision.cliente_telefono2 || '';
    const telefonosValue = tel1 && tel2 ? `${tel1} / ${tel2}` : (tel1 || tel2 || '—');

    // Documento
    const docValue = remision.documento || remision.numero_documento || remision.cliente_documento || '—';

    const ciudadBarrioValue = remision.ciudad && remision.barrio ? `${remision.ciudad} / ${remision.barrio}` : (remision.ciudad || remision.barrio || '—');
    const metodoPagoValue = (remision.sin_saldo || remision.sinSaldo) && !(remision.metodo_pago || remision.metodoPago) ? 'No aplica' : (METODOS_PAGO_MAP[remision.metodo_pago || remision.metodoPago] || '—');

    // Orden exacta solicitada: 4 filas × 3 columnas = 12 campos
    const fields = [
        [
            { label: 'Fecha de Entrega', value: formatDate(remision.fecha_entrega || remision.fechaEntrega) },
            { label: 'Hora Programada', value: `${formatTime12h(remision.hora_desde || remision.horaDesde)} - ${formatTime12h(remision.hora_hasta || remision.horaHasta)}` },
            { label: 'Orden de Compra', value: String(remision.orden_asociada || remision.ordenAsociadaId || '—') },
        ],
        [
            { label: 'Dirección de Entrega', value: remision.direccion_entrega || remision.direccionEntrega || '—' },
            { label: 'Ciudad / Barrio', value: ciudadBarrioValue },
            { label: 'Transportador', value: remision.transportador_usuario_nombre || remision.transportador_display || remision.transportador || '—' },
        ],
        [
            { label: 'Asesor Comercial', value: remision.vendedor_nombre || remision.vendedor || '—' },
            { label: 'Saldo Pendiente', value: saldoValue },
            { label: 'Método de Pago', value: metodoPagoValue },
        ],
        [
            { label: 'Cliente', value: remision.cliente_nombre || remision.clienteNombre || '—' },
            { label: 'Teléfonos', value: telefonosValue },
            { label: 'Documento', value: docValue },
        ],
    ];

    const colsX = [MARGIN_X, MARGIN_X + col1W + colGap, MARGIN_X + col1W * 2 + colGap * 2];
    const ROW_H = 13;

    fields.forEach((row, rowIdx) => {
        const rowY = y + rowIdx * ROW_H;
        if (rowIdx % 2 === 0) {
            fillRect(doc, MARGIN_X, rowY - 2, CONTENT_W, ROW_H - 1, C.ultraLight);
        }
        row.forEach((cell, colIdx) => {
            const cx = colsX[colIdx];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(...C.lightGray);
            doc.text(String(cell.label).toUpperCase(), cx, rowY + 3.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.2);
            doc.setTextColor(...C.darkGray);
            // Para campos largos (dirección, teléfonos) usar maxWidth
            const oneLine = doc.splitTextToSize(String(cell.value), col1W - 2)[0] || '—';
            doc.text(oneLine, cx, rowY + 9);
        });
    });

    y += fields.length * ROW_H + 2;

    // Observación
    const obs = remision.observacion;
    if (obs) {
        fillRect(doc, MARGIN_X, y, CONTENT_W, 11, C.ultraLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...C.lightGray);
        doc.text('OBSERVACIÓN', MARGIN_X + 2, y + 4);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...C.darkGray);
        const obsLines = doc.splitTextToSize(obs, CONTENT_W - 4);
        doc.text(obsLines, MARGIN_X + 2, y + 9);
        y += Math.max(12, obsLines.length * 4 + 6);
    }

    return y + 4;
}

// ─── TABLA DE PRODUCTOS ───────────────────────────────────────────────────────
function drawProductsTable(doc, items, startY) {
    let y = startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.black);
    doc.text('RELACIÓN DE PRODUCTOS ENTREGADOS', MARGIN_X, y);
    y += 5;

    // Columnas solicitadas: #, ID REF., Producto, Cantidad, Categoría, Subcategoría, Variación, Observación
    const cols = [
        { label: '#', w: 6 },
        { label: 'ID Ref.', w: 14 },
        { label: 'Producto', w: 46 },
        { label: 'Cantidad', w: 16 },
        { label: 'Categoría', w: 24 },
        { label: 'Subcategoría', w: 24 },
        { label: 'Variación', w: 22 },
        { label: 'Observación', w: 36 },
    ];

    const totalW = cols.reduce((s, c) => s + c.w, 0);
    const scale = CONTENT_W / totalW;
    const scaledCols = cols.map(c => ({ ...c, w: c.w * scale }));
    const ROW_H = 7;

    // Header
    fillRect(doc, MARGIN_X, y, CONTENT_W, ROW_H, C.black);
    let cx = MARGIN_X + 2;
    scaledCols.forEach(col => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...C.white);
        doc.text(col.label.toUpperCase(), cx, y + 4.8);
        cx += col.w;
    });
    y += ROW_H;
    const tableStartY = y;

    if (!items || items.length === 0) {
        fillRect(doc, MARGIN_X, y, CONTENT_W, 9, C.ultraLight);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...C.lightGray);
        doc.text('Sin ítems registrados.', MARGIN_X + 3, y + 5.5);
        y += 11;
    } else {
        items.forEach((item, idx) => {
            const bg = idx % 2 === 0 ? C.white : C.ultraLight;
            fillRect(doc, MARGIN_X, y, CONTENT_W, ROW_H, bg);

            const values = [
                String(idx + 1),
                String(item.id_referencia || item.invId || item.id || '—'),
                item.producto_nombre || item.nombre || '—',
                String(item.cantidad || item.quantity || '1'),
                item.categoria_nombre || item.cat || '—',
                item.subcategoria_nombre || item.subcat || '—',
                item.variacion || '—',
                item.observacion || '—',
            ];

            let vx = MARGIN_X + 2;
            values.forEach((val, vi) => {
                doc.setFont('helvetica', vi === 2 ? 'bold' : 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(...C.darkGray);
                const maxW = scaledCols[vi].w - 3;
                const display = doc.splitTextToSize(String(val), maxW)[0] || '—';
                doc.text(display, vx, y + 4.8);
                vx += scaledCols[vi].w;
            });

            hLine(doc, MARGIN_X, y + ROW_H, CONTENT_W, C.veryLight, 0.15);
            y += ROW_H;
        });
    }

    strokeRect(doc, MARGIN_X, tableStartY, CONTENT_W, y - tableStartY, C.veryLight, 0.3);
    return y + 6;
}

// ─── FIRMAS (2 bloques) ───────────────────────────────────────────────────────
function drawSignatures(doc, startY) {
    let y = startY;

    fillRect(doc, MARGIN_X, y, CONTENT_W, 8, C.ultraLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.black);
    doc.text('CONFIRMACIÓN DE RECEPCIÓN', MARGIN_X + 3, y + 5.2);
    y += 12;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.midGray);
    const instructivo = 'Al firmar este documento, el receptor confirma haber recibido los productos relacionados en perfectas condiciones y a entera satisfacción, de conformidad con las especificaciones acordadas.';
    const instrLines = doc.splitTextToSize(instructivo, CONTENT_W);
    doc.text(instrLines, MARGIN_X, y);
    y += instrLines.length * 4 + 8;

    const gap = 10;
    const sigW = (CONTENT_W - gap) / 2;
    const sigH = 34;

    const sigs = [
        // Punto 4: primer bloque SIN subtítulo
        { title: 'DESPACHADO POR', sub: null },
        { title: 'RECIBIDO POR', sub: 'Nombre completo y C.C. del receptor' },
    ];

    sigs.forEach((sig, i) => {
        const sx = MARGIN_X + i * (sigW + gap);
        const sy = y;

        strokeRect(doc, sx, sy, sigW, sigH, C.veryLight, 0.45);

        // Línea de firma
        hLine(doc, sx + 6, sy + sigH - 13, sigW - 12, C.midGray, 0.6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(...C.lightGray);
        doc.text('Firma', sx + 6, sy + sigH - 10);

        // Línea C.C. / Fecha
        hLine(doc, sx + 6, sy + sigH - 4, sigW - 12, C.lightGray, 0.35);
        doc.setFontSize(5.5);
        doc.text('C.C. / Fecha', sx + 6, sy + sigH - 1.5);

        // Título
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...C.black);
        doc.text(sig.title, sx + sigW / 2, sy + sigH + 5.5, { align: 'center' });

        // Subtítulo opcional
        if (sig.sub) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(...C.lightGray);
            doc.text(sig.sub, sx + sigW / 2, sy + sigH + 10, { align: 'center' });
        }
    });

    y += sigH + 14;
    return y;
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function drawFooter(doc, remision) {
    const fy = PAGE_H - MARGIN_Y - 12;
    hLine(doc, MARGIN_X, fy, CONTENT_W, C.veryLight, 0.3);
    const fechaImpresion = new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...C.lightGray);
    doc.text(`Documento generado el ${fechaImpresion}`, MARGIN_X, fy + 4);
    doc.text(
        `Remisión N° ${String(remision.id).padStart(5, '0')} — LOTTUS MUEBLES S.A.S. — Este documento tiene validez comercial.`,
        MARGIN_X, fy + 8,
    );
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.darkGray);
    doc.text('Pág. 1 de 1', PAGE_W - MARGIN_X, fy + 6, { align: 'right' });
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────
export async function generateRemisionPDF(remision, inventarioItems = []) {
    try { await document.fonts.load('16px "Audiowide"'); } catch (_) { }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setFont('helvetica', 'normal');

    let cursorY = drawHeader(doc);
    cursorY = drawDocTitle(doc, remision, cursorY);
    cursorY = drawInfoGrid(doc, remision, cursorY);
    cursorY = drawProductsTable(doc, inventarioItems, cursorY);
    cursorY += 4;

    if (cursorY + 72 > PAGE_H - MARGIN_Y - 15) {
        doc.addPage();
        cursorY = MARGIN_Y + 5;
    }

    drawSignatures(doc, cursorY);
    drawFooter(doc, remision);

    doc.save(`Remision_LOTTUS_${String(remision.id).padStart(5, '0')}.pdf`);
}
