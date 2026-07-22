import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNotification from '../components/AppNotification';
import '../components/AppNotification.css';
import './NuevaVenta.css';
import API from '../services/api';

const NuevaVenta = () => {
  const navigate = useNavigate();

  // ── Estado: Búsqueda de cliente ────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSharedVendors, setShowSharedVendors] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Estado: cliente ─────────────────────────────────────────────────────────
  const [clienteId, setClienteId] = useState(null); // ID del cliente existente seleccionado
  const [isClienteNuevo, setIsClienteNuevo] = useState(true);
  const [clienteTitle, setClienteTitle] = useState('Cliente Nuevo');
  const [clienteData, setClienteData] = useState({
    nombre: '',
    cedula: '',
    correo: '',
    direccion: '',
    barrio: '',
    ciudad: 'Bogotá',
    telefono1: '',
    telefono2: ''
  });

  // ── Estado: venta ───────────────────────────────────────────────────────────
  const [ventaData, setVentaData] = useState({
    id: '',
    id_vendedor: '',
    vendedores_compartidos: [],
    traslado: false,
    sede: 'Lottus 1',
    fecha_venta: '',
    fecha_entrega: '',
    valor_total: ''
  });

  const [observacion, setObservacion] = useState('');
  const [vendedores, setVendedores] = useState([]);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Cargar vendedores y fecha por defecto al montar el componente
  useEffect(() => {
    const fetchVendedores = async () => {
      try {
        const response = await API.get(`/vendedores/`);
        setVendedores(response.data || []);
      } catch (error) {
        console.error('Error cargando vendedores:', error);
        setNotification({ message: 'Error al cargar los vendedores.', type: 'error' });
      }
    };
    fetchVendedores();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setVentaData(prev => ({ ...prev, fecha_venta: `${yyyy}-${mm}-${dd}` }));
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda con debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);

    // Limpiar selección previa si el usuario modifica el texto
    if (clienteId) {
      setClienteId(null);
      setIsClienteNuevo(true);
      setClienteTitle('Cliente Nuevo');
      setClienteData({ nombre: '', cedula: '', correo: '', direccion: '', barrio: '', ciudad: 'Bogotá', telefono1: '', telefono2: '' });
    }

    clearTimeout(debounceRef.current);
    if (!value.trim() || value.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await API.get(`/clientes/?search=${encodeURIComponent(value)}&limit=8`);
        const results = res.data?.results || res.data || [];
        setSearchResults(results);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Seleccionar cliente del dropdown
  const handleSelectCliente = (cliente) => {
    setClienteId(cliente.id);
    setSearchTerm(`${cliente.nombre} ${cliente.cedula ? `— Céd: ${cliente.cedula}` : ''}`.trim());
    setShowDropdown(false);
    setSearchResults([]);
    setClienteData({
      nombre: cliente.nombre || '',
      cedula: cliente.cedula || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || '',
      barrio: cliente.barrio || '',
      ciudad: cliente.ciudad || 'Bogotá',
      telefono1: cliente.telefono1 || '',
      telefono2: cliente.telefono2 || '',
    });
    setClienteTitle('Cliente Existente');
    setIsClienteNuevo(false);
  };

  // Cambiar a pestaña Cliente Existente
  const handleTabExistente = () => {
    setIsClienteNuevo(false);
    setClienteTitle('Buscar Cliente Existente');
    setClienteId(null);
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
    setClienteData({ nombre: '', cedula: '', correo: '', direccion: '', barrio: '', ciudad: 'Bogotá', telefono1: '', telefono2: '' });
  };

  // Nuevo cliente: limpiar todo y habilitar edición
  const handleNuevoCliente = () => {
    setClienteId(null);
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
    setClienteData({ nombre: '', cedula: '', correo: '', direccion: '', barrio: '', ciudad: 'Bogotá', telefono1: '', telefono2: '' });
    setIsClienteNuevo(true);
    setClienteTitle('Cliente Nuevo');
  };

  // Manejar cambios en los campos del cliente
  const handleClienteChange = (e) => {
    const { name, value } = e.target;
    setClienteData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar cambios en los campos de la venta
  const handleVentaChange = (e) => {
    const { name, value } = e.target;
    setVentaData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification({ message: '', type: '' });

    const payload = {
      cliente_nuevo: isClienteNuevo,
      cliente: {
        id: isClienteNuevo ? undefined : clienteId,
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
        fecha_venta: ventaData.fecha_venta,
        fecha_entrega: ventaData.fecha_entrega || null,
        valor_total: parseFloat(ventaData.valor_total)
      },
      observacion: observacion || undefined
    };

    try {

      await API.post(`/ventas/crear/`, payload);

      setNotification({ message: 'Venta creada exitosamente.', type: 'success' });
      setTimeout(() => {
        navigate('/ventas');
      }, 2000);

    } catch (error) {
      let friendlyError = 'Error al crear la venta.';
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.venta && errorData.venta.id && errorData.venta.id[0].includes('ya existe')) {
          friendlyError = 'El ID de la venta ya existe.';
        } else if (errorData.cliente && errorData.cliente.cedula && errorData.cliente.cedula[0].includes('ya existe')) {
          friendlyError = 'La cédula del cliente ya existe.';
        } else if (typeof errorData === 'string') {
          friendlyError = errorData;
        } else {
          const firstErrorKey = Object.keys(errorData)[0];
          if (firstErrorKey) {
            const firstError = errorData[firstErrorKey];
            if (Array.isArray(firstError)) {
              friendlyError = firstError[0];
            } else {
              friendlyError = JSON.stringify(errorData);
            }
          }
        }
      }
      setNotification({ message: friendlyError, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cancelar
  const handleCancel = () => {
    navigate('/ventas');
  };

  return (
    <div className="nueva-venta-container">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      {isLoading && (
        <div className="nv-loader-container">
          <div className="nv-loader"></div>
        </div>
      )}

      <div className="nv-form-sections">
      {/* ── Sección de búsqueda de cliente ── */}
        <div className="cliente-section nv-card">
          <div className="nv-cliente-search-header">
            <div className="nv-cliente-tabs">
              <button
                type="button"
                className={`nv-tab-btn ${isClienteNuevo ? 'active' : ''}`}
                onClick={handleNuevoCliente}
              >
                Nuevo Cliente
              </button>
              <button
                type="button"
                className={`nv-tab-btn ${!isClienteNuevo ? 'active' : ''}`}
                onClick={handleTabExistente}
              >
                Existente
              </button>
            </div>
          </div>

          {/* Buscador por nombre/cédula - Solo visible si es Existente */}
          {!isClienteNuevo && (
            <div className="nv-search-wrapper" ref={searchRef}>
            <div className="nv-search-cliente">
              <div className="nv-search-input-wrap">
                <svg className="nv-search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o cédula..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                />
                {isSearching && <div className="nv-search-spinner" />}
                {searchTerm && !isSearching && (
                  <button
                    type="button"
                    className="nv-search-clear"
                    onClick={handleNuevoCliente}
                    title="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown de resultados */}
            {showDropdown && searchResults.length > 0 && (
              <ul className="nv-search-dropdown">
                {searchResults.map(cliente => (
                  <li
                    key={cliente.id}
                    className="nv-search-item"
                    onMouseDown={() => handleSelectCliente(cliente)}
                  >
                    <div className="nv-search-item-name">{cliente.nombre}</div>
                    <div className="nv-search-item-meta">
                      {cliente.cedula && <span>Céd: {cliente.cedula}</span>}
                      {cliente.ciudad && <span>{cliente.ciudad}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && !isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
              <div className="nv-search-empty">Sin resultados.</div>
            )}
          </div>
          )}

          {/* Indicador de cliente seleccionado */}
          {!isClienteNuevo && clienteId && (
            <div className="nv-cliente-badge">
              <span className="nv-badge-dot" />
              <span>Cliente existente seleccionado (puedes editar sus datos si lo deseas)</span>
              <button type="button" onClick={handleTabExistente} className="nv-badge-clear">Cambiar</button>
            </div>
          )}

          {/* Formulario del cliente (Visible siempre en Nuevo, o si ya seleccionó un Existente) */}
          {(isClienteNuevo || (!isClienteNuevo && clienteId)) && (
            <div className="cliente-form">
            <h3>{clienteTitle}</h3>
            <div className="nv-cliente-data-columns">
              <div className="column">
                <div className="nv-form-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    name="nombre"
                    value={clienteData.nombre}
                    onChange={handleClienteChange}
                    required
                  />
                </div>
                <div className="nv-form-group">
                  <label>Cédula:</label>
                  <input
                    type="text"
                    name="cedula"
                    value={clienteData.cedula}
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
          )}
        </div>

        {/* Sección de Datos de la Venta y Observación */}
        <div className="venta-section nv-card">
          <div className="venta-form">
            <h3>Datos de la Venta</h3>
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
              </div>
              <div className="column">
                <div className="nv-form-group">
                  <label>Fecha de Venta:</label>
              <input
                type="date"
                name="fecha_venta"
                value={ventaData.fecha_venta}
                onChange={handleVentaChange}
                required
              />
            </div>
            <div className="nv-form-group">
              <label>Fecha de Entrega:</label>
              <input
                type="date"
                name="fecha_entrega"
                value={ventaData.fecha_entrega}
                onChange={handleVentaChange}
              />
            </div>
            <div className="nv-form-group">
                  <label>Valor Total:</label>
                  <input
                    type="number"
                    name="valor_total"
                    value={ventaData.valor_total}
                    onChange={handleVentaChange}
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

      <div className="nv-form-actions">
        <button className="nv-cancel-button" onClick={handleCancel} disabled={isLoading}>
          Cancelar
        </button>
        <button className="nv-submit-button" onClick={handleSubmit} disabled={isLoading}>
          Crear Venta
        </button>
      </div>
    </div >
  );
};

export default NuevaVenta;