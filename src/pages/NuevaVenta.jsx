import TipoPersonaSelect from '../components/clientes/TipoPersonaSelect';
import { nombreClienteLabel, documentoClienteLabel } from '../utils/clientes';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaFileInvoiceDollar, FaCheckCircle } from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import { AppContext } from '../AppContext';
import { useBorrador } from '../hooks/useBorrador';
import { useIdempotencia } from '../hooks/useIdempotencia';
import '../components/AppNotification.css';
import { PageHeader, Button } from '../components/ui';
import './NuevaVenta.css';
import API from '../services/api';
import { mensajeDeError } from '../services/errores';
import { getTodayStr } from '../utils/dates';
import { useVendedores } from '../hooks/useSharedData';

const NuevaVenta = () => {
  const navigate = useNavigate();

  const [showSharedVendors, setShowSharedVendors] = useState(false);

  // ── Estado: cliente ─────────────────────────────────────────────────────────
  // Un cliente se considera "existente" cuando clienteId tiene valor (encontrado
  // automáticamente al escribir la cédula). No hay pestañas manuales: el sistema
  // detecta si el cliente ya existe.
  const emptyCliente = { tipo_persona: 'natural', cedula: '', nombre: '', correo: '', direccion: '', barrio: '', ciudad: 'Bogotá', telefono1: '', telefono2: '' };
  const [clienteId, setClienteId] = useState(null);
  const [cedulaCheckStatus, setCedulaCheckStatus] = useState('idle'); // idle | checking | found | not_found | error
  const cedulaDebounceRef = useRef(null);
  const latestCedulaRef = useRef('');
  const [clienteData, setClienteData] = useState(emptyCliente);

  // ── Estado: venta ───────────────────────────────────────────────────────────
  const [ventaData, setVentaData] = useState({
    id: '',
    id_vendedor: '',
    vendedores_compartidos: [],
    traslado: false,
    sede: '',
    es_postferia: false,
    fecha_venta: '',
    fecha_entrega: '',
    valor_total: '',
  });

  const [observacion, setObservacion] = useState('');
  const { usuario, notify } = useContext(AppContext);
  const idempotencia = useIdempotencia();
  const { data: vendedores = [], isError: vendedoresError } = useVendedores();
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Cargar fecha por defecto al montar el componente
  useEffect(() => {
    setVentaData(prev => ({ ...prev, fecha_venta: getTodayStr() }));
  }, []);

  // Notificación cuando falla la carga de vendedores
  useEffect(() => {
    if (vendedoresError) {
      console.error('Error cargando vendedores');
      setNotification({ message: 'Error al cargar los vendedores.', type: 'error' });
    }
  }, [vendedoresError]);

  // Limpia el cliente seleccionado/emparejado y reinicia el formulario
  const resetCliente = () => {
    clearTimeout(cedulaDebounceRef.current);
    latestCedulaRef.current = '';
    setClienteId(null);
    setCedulaCheckStatus('idle');
    setClienteData(emptyCliente);
  };

  useEffect(() => () => clearTimeout(cedulaDebounceRef.current), []);

  // Verifica en el backend si ya existe un cliente con esa cédula exacta
  const checkCedula = async (cedulaValue) => {
    try {
      const res = await API.get(`/clientes/?cedula=${encodeURIComponent(cedulaValue)}`);
      if (latestCedulaRef.current.trim() !== cedulaValue) return; // el usuario ya siguió escribiendo
      const results = res.data?.results || res.data || [];
      const match = Array.isArray(results) ? results[0] : null;

      if (match) {
        setClienteId(match.id);
        setClienteData({
          tipo_persona: match.tipo_persona || 'natural',
          cedula: match.cedula || cedulaValue,
          nombre: match.nombre || '',
          correo: match.correo || '',
          direccion: match.direccion || '',
          barrio: match.barrio || '',
          ciudad: match.ciudad || 'Bogotá',
          telefono1: match.telefono1 || '',
          telefono2: match.telefono2 || '',
        });
        setCedulaCheckStatus('found');
      } else {
        setClienteId(null);
        setCedulaCheckStatus('not_found');
      }
    } catch (error) {
      if (latestCedulaRef.current.trim() !== cedulaValue) return;
      console.error('Error al verificar cédula:', error);
      setCedulaCheckStatus('error');
    }
  };

  // Manejar cambios en los campos del cliente
  const handleClienteChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cedula') {
      latestCedulaRef.current = value;

      // Si el usuario corrige la cédula de un cliente ya emparejado, se descarta ese match
      if (clienteId) {
        setClienteId(null);
        setClienteData({ ...emptyCliente, tipo_persona: clienteData.tipo_persona, cedula: value });
      } else {
        setClienteData(prev => ({ ...prev, cedula: value }));
      }

      clearTimeout(cedulaDebounceRef.current);
      const trimmed = value.trim();

      if (trimmed.length < 5) {
        setCedulaCheckStatus('idle');
        return;
      }

      setCedulaCheckStatus('checking');
      cedulaDebounceRef.current = setTimeout(() => checkCedula(trimmed), 450);
      return;
    }

    setClienteData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar cambios en los campos de la venta
  const handleVentaChange = (e) => {
    const { name, value } = e.target;
    if (name === 'valor_total') {
      const numericValue = value.replace(/\D/g, '');
      const formattedValue = numericValue ? new Intl.NumberFormat('es-CO').format(numericValue) : '';
      setVentaData(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setVentaData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ── Borrador automático (P08-06, U02): se guarda por usuario y se
  // recupera tras sesión vencida, red caída o cierre accidental. La fecha de
  // venta por defecto no cuenta como contenido.
  const restaurarBorrador = (b) => {
    if (!b || typeof b !== 'object') return;
    setClienteId(b.clienteId ?? null);
    setClienteData({ ...emptyCliente, ...(b.clienteData || {}) });
    setVentaData(prev => ({ ...prev, ...(b.ventaData || {}) }));
    setObservacion(b.observacion || '');
    setCedulaCheckStatus(b.clienteId ? 'found' : 'idle');
  };
  const hayContenidoVenta = Boolean(
    clienteData.cedula || clienteData.nombre || ventaData.id || ventaData.id_vendedor ||
    ventaData.valor_total || ventaData.fecha_entrega || observacion ||
    ventaData.vendedores_compartidos.length
  );
  const borrador = useBorrador({
    clave: 'nueva-venta',
    dueno: usuario?.id ?? usuario?.username ?? null,
    version: 1,
    datos: { clienteId, clienteData, ventaData, observacion },
    hayContenido: hayContenidoVenta,
    restaurar: restaurarBorrador,
  });

  const descartarBorrador = () => {
    borrador.descartar();
    resetCliente();
    setVentaData({
      id: '', id_vendedor: '', vendedores_compartidos: [], traslado: false,
      sede: '', es_postferia: false, fecha_venta: getTodayStr(), fecha_entrega: '', valor_total: '',
    });
    setObservacion('');
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification({ message: '', type: '' });

    const payload = {
      cliente_nuevo: !clienteId,
      cliente: {
        id: clienteId || undefined,
        tipo_persona: clienteData.tipo_persona,
        nombre: clienteData.nombre,
        cedula: clienteData.cedula,
        correo: clienteData.correo,
        direccion: clienteData.direccion || null,
        barrio: clienteData.barrio || null,
        ciudad: clienteData.ciudad || null,
        telefono1: clienteData.telefono1 || null,
        telefono2: clienteData.telefono2 || null
      },
      venta: {
        id: ventaData.id,
        id_vendedor: ventaData.id_vendedor,
        vendedores_compartidos: ventaData.vendedores_compartidos,
        traslado: ventaData.traslado,
        sede: ventaData.sede,
        // Postferia: solo estadística (2026-10-08); reemplaza al check de Feria del Hogar.
        es_postferia: ventaData.es_postferia,
        fecha_venta: ventaData.fecha_venta,
        fecha_entrega: ventaData.fecha_entrega || null,
        // El precio de lista no se digita: es la suma de los productos de la venta (D15a).
        valor_total: parseFloat(ventaData.valor_total.toString().replace(/\D/g, ''))
      },
      observacion: observacion || undefined
    };

    try {
      // Reintentar el MISMO contenido reusa la clave y no duplica la venta (P08-06).
      const { data } = await API.post(`/ventas/crear/`, payload, { headers: idempotencia.cabeceras(payload) });
      idempotencia.confirmar();
      borrador.limpiarTrasGuardar();
      // Aviso discreto (toast global, sigue visible en Ventas) en vez de la pantalla completa.
      notify(`Venta ${data?.venta_id ?? ventaData.id} creada exitosamente.`, 'success');
      navigate('/ventas');
      return;
    } catch (error) {
      setIsLoading(false);
      // Sin respuesta, permiso, validación por campo, etc.: mensaje legible común (U03).
      let friendlyError = mensajeDeError(error, 'Error al crear la venta.');
      const errorData = error.response?.data;
      if (errorData?.venta?.id?.[0]?.includes?.('ya existe')) {
        friendlyError = 'El ID de la venta ya existe.';
      } else if (errorData?.cliente?.cedula?.[0]?.includes?.('ya existe')) {
        friendlyError = `El documento (${documentoClienteLabel(clienteData)}) del cliente ya existe.`;
      }
      setNotification({ message: friendlyError, type: 'error' });
    }
  };

  // Manejar cancelar
  const handleCancel = () => {
    navigate('/ventas');
  };

  return (
    <div className="ds-page nueva-venta-container ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* --- HEADER PRINCIPAL --- */}
      <PageHeader
        icon={FaShoppingCart}
        title="Nueva Venta"
        subtitle="Registra la información del cliente y los datos de la transacción en el sistema."
        actions={
          <>
            <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit} loading={isLoading}>
              {isLoading ? "Creando..." : "Crear Venta"}
            </Button>
          </>
        }
      />

      {borrador.restaurado && (
        <div className="nv-borrador-banner" role="status">
          <span>
            Se recuperó un borrador guardado el{' '}
            {new Date(borrador.restaurado.guardadoAt).toLocaleString('es-CO')}.
          </span>
          <Button variant="ghost" onClick={descartarBorrador}>Descartar borrador</Button>
        </div>
      )}

      <div className="nv-form-sections">
        {/* ── Sección de información de cliente ── */}
        <div className="cliente-section nv-card">
          <div className="nv-card-header">
            <div className="nv-card-title">
              <div className="section-icon-badge badge-blue"><FaUser /></div>
              <h3>Información del Cliente</h3>
            </div>
          </div>

          {/* Indicador de cliente encontrado automáticamente por cédula */}
          {clienteId && cedulaCheckStatus === 'found' && (
            <div className="nv-cliente-badge">
              <span className="nv-badge-dot" />
              <span>Cliente existente encontrado — datos cargados automáticamente. Puedes editarlos si lo deseas.</span>
              <button type="button" onClick={resetCliente} className="nv-badge-clear">No es este cliente</button>
            </div>
          )}

          <div className="cliente-form">
            <h3>{clienteId ? 'Cliente Existente' : 'Cliente Nuevo'}</h3>
            <div className="nv-form-group"><TipoPersonaSelect value={clienteData.tipo_persona} onChange={handleClienteChange} /></div>
            <div className="nv-cliente-data-columns">
              <div className="column">
                <div className="nv-form-group">
                  <label htmlFor="nv-documento">{documentoClienteLabel(clienteData)}:</label>
                  <div className="nv-cedula-input-wrap">
                    <input
                      type="text"
                      id="nv-documento" name="cedula"
                      value={clienteData.cedula}
                      onChange={handleClienteChange}
                      placeholder={`Escribe ${documentoClienteLabel(clienteData)} para verificar...`}
                      autoComplete="off"
                      required
                    />
                    {cedulaCheckStatus === 'checking' && <div className="nv-cedula-status-spinner" />}
                    {cedulaCheckStatus === 'found' && <FaCheckCircle className="nv-cedula-status-icon icon-found" />}
                  </div>
                  {cedulaCheckStatus === 'not_found' && (
                    <span className="nv-cedula-hint hint-new">Documento no registrado — se creará un cliente nuevo.</span>
                  )}
                  {cedulaCheckStatus === 'error' && (
                    <span className="nv-cedula-hint hint-error">No se pudo verificar el documento. Continúa y se validará al guardar.</span>
                  )}
                </div>
                <div className="nv-form-group">
                  <label htmlFor="nv-nombre">{nombreClienteLabel(clienteData)}:</label>
                  <input
                    type="text"
                    id="nv-nombre" name="nombre"
                    value={clienteData.nombre}
                    onChange={handleClienteChange}
                    required
                  />
                </div>
                <div className="nv-form-group">
                  <label className="label-correo">Correo:</label>
                  <input
                    type="email"
                    name="correo"
                    value={clienteData.correo}
                    onChange={handleClienteChange}
                    required
                  />
                </div>
                <div className="nv-form-group">
                  <label className="label-direccion">Dirección:</label>
                  <input
                    type="text"
                    name="direccion"
                    value={clienteData.direccion}
                    onChange={handleClienteChange}
                  />
                </div>
              </div>
              <div className="column">
                <div className="nv-form-group">
                  <label>Barrio:</label>
                  <input
                    type="text"
                    name="barrio"
                    value={clienteData.barrio}
                    onChange={handleClienteChange}
                  />
                </div>
                <div className="nv-form-group">
                  <label>Ciudad:</label>
                  <input
                    type="text"
                    name="ciudad"
                    value={clienteData.ciudad}
                    onChange={handleClienteChange}
                  />
                </div>
                <div className="nv-form-group">
                  <label>Teléfono 1:</label>
                  <input
                    type="text"
                    name="telefono1"
                    value={clienteData.telefono1}
                    onChange={handleClienteChange}
                  />
                </div>
                <div className="nv-form-group">
                  <label>Teléfono 2:</label>
                  <input
                    type="text"
                    name="telefono2"
                    value={clienteData.telefono2}
                    onChange={handleClienteChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Datos de la Venta y Observación */}
        <div className="venta-section nv-card">
          <div className="nv-card-header">
            <div className="nv-card-title">
              <div className="section-icon-badge badge-indigo"><FaFileInvoiceDollar /></div>
              <h3>Datos de la Venta</h3>
            </div>
          </div>
          <div className="venta-form">
            <div className="nv-cliente-data-columns">
              <div className="column">
                <div className="nv-form-group">
                  <label>ID Venta:</label>
              <input
                type="text"
                name="id"
                value={ventaData.id}
                onChange={handleVentaChange}
                required
              />
            </div>
            <div className="nv-form-group">
              <label>Vendedor Principal:</label>
              <select
                name="id_vendedor"
                value={ventaData.id_vendedor}
                onChange={(e) => {
                  handleVentaChange(e);
                  // Remove the new main vendor from shared vendors if they were there
                  setVentaData(prev => ({
                    ...prev, 
                    vendedores_compartidos: prev.vendedores_compartidos.filter(id => id !== e.target.value)
                  }));
                }}
                required
              >
                <option value="">Seleccionar vendedor</option>
                {(vendedores || []).map((vendedor) => (
                  <option key={vendedor?.id} value={vendedor?.id}>
                    {vendedor?.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="nv-form-group">
              <label>Sede:</label>
              <select
                name="sede"
                value={ventaData.sede}
                onChange={handleVentaChange}
                required
              >
                <option value="" disabled>Seleccione una sede</option>
                <option value="Lottus 1">Lottus 1</option>
                <option value="Lottus 2">Lottus 2</option>
              </select>
            </div>
            <div className="nv-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                name="traslado"
                id="traslado"
                checked={ventaData.traslado}
                onChange={(e) => setVentaData(prev => ({...prev, traslado: e.target.checked}))}
              />
              <label htmlFor="traslado" style={{marginBottom: 0}}>¿Incluye Traslado?</label>
            </div>
            <div className="nv-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                name="es_postferia"
                id="es_postferia"
                checked={ventaData.es_postferia}
                onChange={(e) => setVentaData(prev => ({...prev, es_postferia: e.target.checked}))}
              />
              <label htmlFor="es_postferia" style={{marginBottom: 0}}>Postferia</label>
            </div>
              </div>
              <div className="column">
                <div className="nv-form-group">
                  <label>Fecha de Venta:</label>
              <input
                type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }}
                name="fecha_venta"
                value={ventaData.fecha_venta}
                onChange={handleVentaChange}
                required
              />
            </div>
            <div className="nv-form-group">
              <label>Fecha de Entrega:</label>
              <input
                type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }}
                name="fecha_entrega"
                value={ventaData.fecha_entrega}
                onChange={handleVentaChange}
              />
            </div>
            <div className="nv-form-group">
                  <label>Valor Total:</label>
                  <input
                    type="text"
                    name="valor_total"
                    value={ventaData.valor_total}
                    onChange={handleVentaChange}
                    placeholder="0"
                    required
                  />
                </div>
              <div className="nv-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={showSharedVendors || (ventaData.vendedores_compartidos && ventaData.vendedores_compartidos.length > 0)} 
                    onChange={(e) => setShowSharedVendors(e.target.checked)} 
                  /> 
                  Venta Compartida (Opcional)
                </label>
                {(showSharedVendors || (ventaData.vendedores_compartidos && ventaData.vendedores_compartidos.length > 0)) && (
                  <div className="nv-checkbox-group" style={{display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px', background: 'var(--ventas-bg-medium)', borderRadius: '8px', marginTop: '0.5rem'}}>
                    {(vendedores || []).filter(v => v?.id?.toString() !== ventaData?.id_vendedor?.toString()).map(v => (
                      <label key={v?.id} style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginBottom: 0}}>
                        <input 
                          type="checkbox" 
                          value={v?.id} 
                          checked={ventaData?.vendedores_compartidos?.includes(v?.id?.toString()) || ventaData?.vendedores_compartidos?.includes(v?.id)}
                          onChange={(e) => {
                            if(e.target.checked) {
                              setVentaData(prev => ({...prev, vendedores_compartidos: [...(prev.vendedores_compartidos || []), v.id]}));
                            } else {
                              setVentaData(prev => ({...prev, vendedores_compartidos: (prev.vendedores_compartidos || []).filter(id => id?.toString() !== v?.id?.toString())}));
                            }
                          }}
                        /> {v?.first_name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
            <div className="nv-form-group" style={{ marginTop: '0.5rem' }}>
              <label>Observación (opcional):</label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows="3"
                placeholder="Escribe una observación..."
                style={{ minHeight: '60px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NuevaVenta;