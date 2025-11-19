import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNotification from '../components/AppNotification';
import '../components/AppNotification.css';
import './NuevaVenta.css';
import API from '../services/api';

const NuevaVenta = () => {
  const navigate = useNavigate();
  
  // Estados para el cliente
  const [clienteId, setClienteId] = useState('');
  const [isClienteNuevo, setIsClienteNuevo] = useState(true);
  const [clienteTitle, setClienteTitle] = useState('Cliente Nuevo');
  const [clienteData, setClienteData] = useState({
    nombre: '',
    cedula: '',
    correo: '',
    direccion: '',
    ciudad: 'Bogotá',
    telefono1: '',
    telefono2: ''
  });

  // Estados para la venta
  const [ventaData, setVentaData] = useState({
    id: '',
    id_vendedor: '',
    fecha_venta: '',
    fecha_entrega: '',
    valor_total: ''
  });

  // Estado para la observación
  const [observacion, setObservacion] = useState('');

  // Estado para los vendedores
  const [vendedores, setVendedores] = useState([]);

  // Estados para manejo de errores y carga
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Cargar vendedores y fecha por defecto al montar el componente
  useEffect(() => {
    const fetchVendedores = async () => {
      try {
        const response = await API.get(`/vendedores/`);
        setVendedores(response.data);
      } catch (error) {
        console.error('Error cargando vendedores:', error);
        setNotification({ message: 'Error al cargar los vendedores.', type: 'error' });
      }
    };
    fetchVendedores();

    // Establecer la fecha de venta por defecto
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0!
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${yyyy}-${mm}-${dd}`;
    setVentaData(prev => ({ ...prev, fecha_venta: formattedToday }));
  }, []);

  // Manejar búsqueda de cliente antiguo
  const handleBuscarCliente = async () => {
    if (!clienteId) {
      setNotification({ message: 'Por favor, ingrese un ID de cliente.', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await API.get(`/clientes/${clienteId}/`);

      const cliente = response.data;
      setClienteData({
        nombre: cliente.nombre || '',
        cedula: cliente.cedula || '',
        correo: cliente.correo || '',
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || 'Bogotá',
        telefono1: cliente.telefono1 || '',
        telefono2: cliente.telefono2 || ''
      });
      setClienteTitle('Cliente Antiguo');
      setIsClienteNuevo(false);
      setNotification({ message: '', type: '' });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setNotification({ message: 'Cliente no existe.', type: 'error' });
      } else {
        setNotification({ message: 'Error al buscar el cliente.', type: 'error' });
      }
      // Limpiar el formulario si no se encuentra el cliente
      setClienteData({
        nombre: '',
        cedula: '',
        correo: '',
        direccion: '',
        ciudad: 'Bogotá',
        telefono1: '',
        telefono2: ''
      });
      setClienteTitle('Cliente Nuevo');
      setIsClienteNuevo(true);
    } finally {
      setIsLoading(false);
    }
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
        ciudad: clienteData.ciudad || null,
        telefono1: clienteData.telefono1 || null,
        telefono2: clienteData.telefono2 || null
      },
      venta: {
        id: ventaData.id,
        id_vendedor: ventaData.id_vendedor,
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
                  } else if (typeof firstError === 'object') {
                      const nestedErrorKey = Object.keys(firstError)[0];
                      friendlyError = firstError[nestedErrorKey][0];
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
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      )}
      
      <div className="form-sections">
        {/* Sección de Cliente Antiguo/Nuevo */}
        <div className="cliente-section card">
          <div className="cliente-antiguo">
            <h3>Buscar Cliente Antiguo</h3>
            <div className="search-cliente">
              <input
                type="text"
                placeholder="ID del cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              />
              <button onClick={handleBuscarCliente} disabled={isLoading}>Buscar</button>
            </div>
          </div>

          <div className="cliente-form">
            <h3>{clienteTitle}</h3>
            <div className="cliente-data-columns">
              <div className="column">
                <div className="form-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    name="nombre"
                    value={clienteData.nombre}
                    onChange={handleClienteChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cédula:</label>
                  <input
                    type="text"
                    name="cedula"
                    value={clienteData.cedula}
                    onChange={handleClienteChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label-correo">Correo:</label>
                  <input
                    type="email"
                    name="correo"
                    value={clienteData.correo}
                    onChange={handleClienteChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono 1:</label>
                  <input
                    type="text"
                    name="telefono1"
                    value={clienteData.telefono1}
                    onChange={handleClienteChange}
                  />
                </div>
              </div>
              <div className="column">
                <div className="form-group">
                  <label>Ciudad:</label>
                  <input
                    type="text"
                    name="ciudad"
                    value={clienteData.ciudad}
                    onChange={handleClienteChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label-direccion">Dirección:</label>
                  <input
                    type="text"
                    name="direccion"
                    value={clienteData.direccion}
                    onChange={handleClienteChange}
                  />
                </div>
                <div className="form-group">
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
        <div className="venta-section card">
          <div className="venta-form">
            <h3>Datos de la Venta</h3>
            <div className="form-group">
              <label>ID Venta:</label>
              <input
                type="text"
                name="id"
                value={ventaData.id}
                onChange={handleVentaChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Vendedor:</label>
              <select
                name="id_vendedor"
                value={ventaData.id_vendedor}
                onChange={handleVentaChange}
                required
              >
                <option value="">Seleccionar vendedor</option>
                {vendedores.map((vendedor) => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Venta:</label>
              <input
                type="date"
                name="fecha_venta"
                value={ventaData.fecha_venta}
                onChange={handleVentaChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha de Entrega:</label>
              <input
                type="date"
                name="fecha_entrega"
                value={ventaData.fecha_entrega}
                onChange={handleVentaChange}
              />
            </div>
            <div className="form-group">
              <label>Valor Total:</label>
              <input
                type="number"
                name="valor_total"
                value={ventaData.valor_total}
                onChange={handleVentaChange}
                required
              />
            </div>
          </div>

          <div className="observacion-form">
            <h3>Observación:</h3>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows="4"
              placeholder="Escribe una observación (opcional)..."
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="cancel-button" onClick={handleCancel} disabled={isLoading}>
          Cancelar
        </button>
        <button className="submit-button" onClick={handleSubmit} disabled={isLoading}>
          Crear Venta
        </button>
      </div>
    </div>
  );
};

export default NuevaVenta;