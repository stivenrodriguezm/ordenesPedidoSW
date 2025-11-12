import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './EditarVenta.css';

const EditarVenta = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get the venta ID from the URL

  // Estados para el cliente
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
    id: id,
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
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch vendedores and venta details on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("accessToken");
      setIsLoading(true);

      try {
        // Fetch vendedores
        const vendedoresResponse = await axios.get('https://api.muebleslottus.com/api/vendedores/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVendedores(vendedoresResponse.data);

        // Fetch venta details
        const ventaResponse = await axios.get(`https://api.muebleslottus.com/api/ventas/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ventaDetails = ventaResponse.data;

        // Set cliente data
        setClienteData({
          id: ventaDetails.cliente.id,
          nombre: ventaDetails.cliente.nombre || '',
          cedula: ventaDetails.cliente.cedula || '',
          correo: ventaDetails.cliente.correo || '',
          direccion: ventaDetails.cliente.direccion || '',
          ciudad: ventaDetails.cliente.ciudad || 'Bogotá',
          telefono1: ventaDetails.cliente.telefono1 || '',
          telefono2: ventaDetails.cliente.telefono2 || ''
        });

        // Set venta data
        setVentaData({
          id: ventaDetails.id_venta,
          id_vendedor: ventaDetails.vendedor_id || '',
          fecha_venta: ventaDetails.fecha_venta || '',
          fecha_entrega: ventaDetails.fecha_entrega || '',
          valor_total: ventaDetails.valor || ''
        });

        // Set observaciones if any
        if (ventaDetails.observaciones_venta.length > 0) {
          setObservacion(ventaDetails.observaciones_venta[0].texto);
        }

      } catch (error) {
        console.error('Error cargando datos:', error);
        setErrorMessage('Error al cargar los datos de la venta.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

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
    setErrorMessage('');

    const token = localStorage.getItem("accessToken");
    const payload = {
      cliente: {
        id: clienteData.id,
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
      }
    };

    try {
      await axios.put(`https://api.muebleslottus.com/api/ventas/${id}/editar/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // If there's an observacion, update or create it
      if (observacion) {
        await axios.post(
          `https://api.muebleslottus.com/api/ventas/${id}/observaciones/`,
          { texto: observacion },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      alert('Venta actualizada exitosamente.');
      navigate('/ventas');
    } catch (error) {
      if (error.response && error.response.data) {
        setErrorMessage(`Error al actualizar la venta: ${JSON.stringify(error.response.data)}`);
      } else {
        setErrorMessage('Error al actualizar la venta.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cancelar
  const handleCancel = () => {
    navigate('/ventas');
  };

  return (
    <div className="editar-venta-container">
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {isLoading && (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      )}
      
      <div className="form-sections">
        {/* Sección de Cliente */}
        <div className="cliente-section card">
          <div className="cliente-form">
            <h3>Datos del Cliente</h3>
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
                disabled
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
          Actualizar Venta
        </button>
      </div>
    </div>
  );
};

export default EditarVenta;