import API from './api';

const base = '/pagos-bancarios';
export const catalogo = () => API.get(`${base}/catalogo/`).then(r => r.data);
export const cuentas = titular => API.get(`${base}/cuentas/`, { params: titular }).then(r => r.data);
export const guardarCuenta = (datos, headers) => (datos.id ? API.patch(`${base}/cuentas/${datos.id}/`, datos) : API.post(`${base}/cuentas/`, datos, { headers })).then(r => r.data);
export const empleados = () => API.get(`${base}/empleados/`).then(r => r.data);
export const guardarEmpleado = (datos, headers) => (datos.id ? API.patch(`${base}/empleados/${datos.id}/`, datos) : API.post(`${base}/empleados/`, datos, { headers })).then(r => r.data);
export const pendientes = params => API.get(`${base}/pendientes/`, { params }).then(r => r.data);
export const lotes = tipo => API.get(`${base}/lotes/`, { params: { tipo } }).then(r => r.data);
export const lote = id => API.get(`${base}/lotes/${id}/`).then(r => r.data);
export const crearLote = (datos, headers) => API.post(`${base}/lotes/`, datos, { headers }).then(r => r.data);
export const guardarLote = (id, datos) => API.patch(`${base}/lotes/${id}/`, datos).then(r => r.data);
export const anularLote = (id, datos) => API.post(`${base}/lotes/${id}/anular/`, datos).then(r => r.data);
export const corregirLote = (id, revision) => API.post(`${base}/lotes/${id}/corregir/`, { revision }).then(r => r.data);
export const programacion = () => API.get(`${base}/programacion/`).then(r => r.data);
export const guardarProgramacion = datos => API.put(`${base}/programacion/`, datos).then(r => r.data);
export const confirmarCE = id => API.patch(`/comprobantes-egreso/${id}/confirmar/`).then(r => r.data);
export const confirmarPagos = (id, datos) => API.post(`${base}/lotes/${id}/confirmar/`, datos).then(r => r.data);
export const reintentarPagos = (id, datos, headers) => API.post(`${base}/lotes/${id}/reintentar/`, datos, { headers }).then(r => r.data);

export async function descargarArchivo(id, revision, huella_revision) {
    try {
        const r = await API.post(`${base}/lotes/${id}/archivo/`, { revision, huella_revision }, { responseType: 'blob' });
        const url = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.headers['content-disposition']?.match(/filename="([^"]+)"/)?.[1] || `Davivienda_${id}.xlsx`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
        if (e.response?.data instanceof Blob) {
            try { e.response.data = JSON.parse(await e.response.data.text()); } catch { /* Se conserva el error HTTP. */ }
        }
        throw e;
    }
}

export const beneficiarios = () => API.get(`${base}/beneficiarios/`).then(r => r.data);
export const revisarCE = comprobantes => API.post(`${base}/revisar-ce/`, { comprobantes }).then(r => r.data);
export const asociarCE = (id, datos) => API.patch(`${base}/comprobantes/${id}/beneficiario/`, datos).then(r => r.data);
export const eliminarCuenta = datos => API.delete(`${base}/cuentas/${datos.id}/`, { data: datos }).then(r => r.data);
export const comprobantes = params => API.get('/comprobantes-egreso/', { params }).then(r => r.data);
