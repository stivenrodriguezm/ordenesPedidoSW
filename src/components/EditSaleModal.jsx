import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

const EditSaleModal = ({ show, onClose, saleData, vendedores, estados, onSaleUpdated, setNotification, fetchVentas, fetchClientes }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    id: '',
    cliente_id: '',
    fecha_venta: '',
    vendedor_id: '',
    valor_total: '',
    estado: '',
    estado_pedidos: false,
  });

  useEffect(() => {
    if (saleData) {
      console.log('saleData.vendedor:', saleData.vendedor);
      console.log('vendedores prop:', vendedores);
      setFormData({
        id: saleData.id,
        cliente_id: saleData.cliente.id,
        fecha_venta: saleData.fecha_venta,
        vendedor_id: saleData.vendedor || '',
        valor_total: parseInt(saleData.valor_total),
        estado: saleData.estado,
        estado_pedidos: saleData.estado_pedidos,
      });
    }
  }, [saleData, vendedores]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");
    const payload = {
      venta: {
        id: formData.id,
        fecha_venta: formData.fecha_venta,
        vendedor: formData.vendedor_id,
        valor_total: parseFloat(formData.valor_total),
        estado: formData.estado,
        estado_pedidos: formData.estado_pedidos,
      },
      cliente: {
        id: formData.cliente_id,
      }
    };

    try {
      await axios.put(`http://127.0.0.1:8000/api/ventas/${formData.id}/editar/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotification({ message: 'Venta actualizada correctamente.', type: 'success' });
      onClose();
      onSaleUpdated(formData.id); // Trigger re-fetch of updated sale details
      fetchVentas(); // Re-fetch all sales to update the main table
      fetchClientes(); // Re-fetch all clients to update the global context
      queryClient.invalidateQueries({ queryKey: ['ventasPendientes'] }); // Invalidate pending sales query
    } catch (error) {
      console.error('Error al editar la venta:', error);
      let friendlyError = 'Error al editar la venta.';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          friendlyError = error.response.data;
        } else if (error.response.data.venta && error.response.data.venta.id && error.response.data.venta.id.length > 0) {
          friendlyError = `Error: ${error.response.data.venta.id[0]}`;
        } else if (error.response.data.cliente && error.response.data.cliente.id && error.response.data.cliente.id.length > 0) {
          friendlyError = `Error: ${error.response.data.cliente.id[0]}`;
        } else {
          friendlyError = JSON.stringify(error.response.data);
        }
      }
      setNotification({ message: friendlyError, type: 'error' });
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="Editar Venta">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ID Venta:</label>
          <input type="text" name="id" value={formData.id} onChange={handleChange} disabled />
        </div>
        <div className="form-group">
          <label>ID Cliente:</label>
          <input type="text" name="cliente_id" value={formData.cliente_id} onChange={handleChange} disabled />
        </div>
        <div className="form-group">
          <label>Fecha de Venta:</label>
          <input type="date" name="fecha_venta" value={formData.fecha_venta} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Vendedor:</label>
          <select name="vendedor_id" value={formData.vendedor_id} onChange={handleChange} required>
            <option value="">Seleccionar vendedor</option>
            {vendedores.map(vendedor => (
              <option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Valor Total:</label>
          <input type="number" name="valor_total" value={formData.valor_total} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Estado:</label>
          <select name="estado" value={formData.estado} onChange={handleChange} required>
            {estados.map(estado => (
              <option key={estado} value={estado}>{estado.charAt(0).toUpperCase() + estado.slice(1).replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="form-group checkbox-group">
          <label>Estado Pedidos:</label>
          <input type="checkbox" name="estado_pedidos" checked={formData.estado_pedidos} onChange={handleChange} />
        </div>
        <button type="submit">Guardar Cambios</button>
      </form>
    </Modal>
  );
};

export default EditSaleModal;
