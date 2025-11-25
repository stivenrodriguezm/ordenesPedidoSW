import React, { useState, useEffect, useContext } from 'react';
import Modal from './Modal';
import { useQueryClient } from '@tanstack/react-query';
import { AppContext } from '../AppContext';
import API from '../services/api';

const EditSaleModal = ({ show, onClose, saleData, vendedores, estados, onSaleUpdated, setNotification, fetchVentas, fetchReportSales, fetchClientes }) => {
  const { usuario } = useContext(AppContext);
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
      setFormData({
        id: saleData.id,
        cliente_id: saleData.cliente.id,
        fecha_venta: saleData.fecha_venta,
        fecha_entrega: saleData.fecha_entrega || '', // Add fecha_entrega
        vendedor_id: saleData.vendedor || '',
        valor_total: parseInt(saleData.valor_total),
        estado: saleData.estado,
        estado_pedidos: saleData.estado_pedidos,
      });
    }
  }, [saleData]);

  // --- Permissions Logic ---
  const isAuxiliar = usuario?.role?.toLowerCase() === 'auxiliar';

  // Rule 1: Disable 'Estado' select if the sale is already 'entregada' for an auxiliar user.
  const isEstadoDisabled = isAuxiliar && formData.estado.trim().toLowerCase() === 'entregado';

  // Rule 2: Disable 'Estado Pedidos' checkbox if it's already true for an auxiliar user.
  const isEstadoPedidosDisabled = isAuxiliar && formData.estado_pedidos;

  // Rule 3: Auxiliar users should not see the 'anulada' option.
  const availableEstados = isAuxiliar ? estados.filter(e => e !== 'anulado') : estados;
  console.log('isAuxiliar:', isAuxiliar);
  console.log('estados:', estados);
  console.log('availableEstados:', availableEstados);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let ventaPayload = {};

    if (isAuxiliar) {
      ventaPayload = {
        estado: formData.estado,
        estado_pedidos: formData.estado_pedidos,
      };
    } else {
      ventaPayload = {
        fecha_venta: formData.fecha_venta,
        fecha_entrega: formData.fecha_entrega || null, // Include fecha_entrega
        vendedor: formData.vendedor_id,
        valor_total: parseFloat(formData.valor_total),
        estado: formData.estado,
        estado_pedidos: formData.estado_pedidos,
      };
    }

    const payload = {
      venta: ventaPayload,
      cliente: { id: formData.cliente_id }
    };

    try {
      await API.put(`/ventas/${formData.id}/editar/`, payload);
      setNotification({ message: 'Venta actualizada correctamente.', type: 'success' });
      onClose();
      onSaleUpdated(formData.id);
      fetchVentas();
      fetchReportSales();
      fetchClientes();
      queryClient.invalidateQueries({ queryKey: ['ventasPendientes'] });
    } catch (error) {
      console.error('Error al editar la venta:', error);
      const friendlyError = error.response?.data?.error || JSON.stringify(error.response?.data) || 'Error al editar la venta.';
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
          <input type="date" name="fecha_venta" value={formData.fecha_venta} onChange={handleChange} required disabled={isAuxiliar} />
        </div>
        <div className="form-group">
          <label>Fecha de Entrega:</label>
          <input type="date" name="fecha_entrega" value={formData.fecha_entrega} onChange={handleChange} disabled={isAuxiliar} />
        </div>
        <div className="form-group">
          <label>Vendedor:</label>
          <select name="vendedor_id" value={formData.vendedor_id} onChange={handleChange} required disabled={isAuxiliar}>
            <option value="">Seleccionar vendedor</option>
            {vendedores.map(vendedor => (
              <option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Valor Total:</label>
          <input type="number" name="valor_total" value={formData.valor_total} onChange={handleChange} required disabled={isAuxiliar} />
        </div>
        <div className="form-group">
          <label>Estado:</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
            disabled={isEstadoDisabled}
          >
            {availableEstados.map(estado => (
              <option key={estado} value={estado}>{estado.charAt(0).toUpperCase() + estado.slice(1).replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="form-group checkbox-group">
          <label>Estado Pedidos:</label>
          <input type="checkbox" name="estado_pedidos" checked={formData.estado_pedidos} onChange={handleChange} disabled={isEstadoPedidosDisabled} />
        </div>
        <button type="submit" className="modal-submit">Guardar Cambios</button>
      </form>
    </Modal>
  );

};

export default EditSaleModal;