import React, { useState, useEffect, useContext } from 'react';
import './EditSaleModal.css';
import Modal from './Modal';
import { useQueryClient } from '@tanstack/react-query';
import { AppContext, usePermissions } from '../AppContext';
import API from '../services/api';

const EditSaleModal = ({ show, onClose, saleData, vendedores, estados, onSaleUpdated, setNotification, fetchVentas, fetchReportSales, fetchClientes }) => {
  const { usuario } = useContext(AppContext);
  const queryClient = useQueryClient();
  const [showSharedVendors, setShowSharedVendors] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    cliente_id: '',
    fecha_venta: '',
    vendedor_id: '',
    vendedores_compartidos: [],
    traslado: false,
    sede: 'Lottus 1',
    valor_total: '',
    estado: '',
    estado_pedidos: false,
  });

  useEffect(() => {
    if (saleData) {
      setFormData({
        id: saleData.id,
        cliente_id: saleData.cliente?.id || '',
        fecha_venta: saleData.fecha_venta,
        fecha_entrega: saleData.fecha_entrega || '', // Add fecha_entrega
        vendedor_id: saleData.vendedor || '',
        vendedores_compartidos: saleData.vendedores_compartidos || [],
        traslado: saleData.traslado || false,
        sede: saleData.sede || 'Lottus 1',
        valor_total: parseInt(saleData.valor_total),
        estado: saleData.estado,
        estado_pedidos: saleData.estado_pedidos,
      });
    }
  }, [saleData]);

  // --- Permissions Logic ---
  const hasPermission = usePermissions();

  const canEditEverything = hasPermission('EDITAR_VENTA') || hasPermission('ALL') || usuario?.role?.toLowerCase() === 'administrador';
  const canEditEstadoVenta = canEditEverything || hasPermission('EDITAR_ESTADO_VENTA');
  const canEditEstadoPedidos = canEditEverything || hasPermission('EDITAR_ESTADO_PEDIDOS_VENTA');

  const isFieldsDisabled = !canEditEverything;
  const isEstadoDisabled = !canEditEstadoVenta || (usuario?.role?.toLowerCase() === 'auxiliar' && (formData.estado || '').trim().toLowerCase() === 'entregado');
  const isEstadoPedidosDisabled = !canEditEstadoPedidos || (usuario?.role?.toLowerCase() === 'auxiliar' && formData.estado_pedidos);

  const availableEstados = (usuario?.role?.toLowerCase() === 'auxiliar' || !canEditEverything)
    ? (estados || []).filter(e => e !== 'anulado')
    : estados;

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

    if (canEditEverything) {
      ventaPayload = {
        fecha_venta: formData.fecha_venta,
        fecha_entrega: formData.fecha_entrega || null, // Include fecha_entrega
        vendedor: formData.vendedor_id,
        vendedores_compartidos: formData.vendedores_compartidos,
        traslado: formData.traslado,
        sede: formData.sede,
        valor_total: parseFloat(formData.valor_total),
        estado: formData.estado,
        estado_pedidos: formData.estado_pedidos,
      };
    } else {
      ventaPayload = {};
      if (canEditEstadoVenta) {
        ventaPayload.estado = formData.estado;
      }
      if (canEditEstadoPedidos) {
        ventaPayload.estado_pedidos = formData.estado_pedidos;
      }
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
      <form onSubmit={handleSubmit} className="edit-sale-form">
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
          <input type="date" name="fecha_venta" value={formData.fecha_venta} onChange={handleChange} required disabled={isFieldsDisabled} />
        </div>
        <div className="form-group">
          <label>Fecha de Entrega:</label>
          <input type="date" name="fecha_entrega" value={formData.fecha_entrega} onChange={handleChange} disabled={isFieldsDisabled} />
        </div>

        <div className="form-group">
          <label>Sede:</label>
          <select name="sede" value={formData.sede} onChange={handleChange} disabled={isFieldsDisabled}>
            <option value="Lottus 1">Lottus 1</option>
            <option value="Lottus 2">Lottus 2</option>
          </select>
        </div>
        <div className="form-group">
          <label>Vendedor Principal:</label>
          <select name="vendedor_id" value={formData.vendedor_id} onChange={(e) => {
                  handleChange(e);
                  setFormData(prev => ({
                    ...prev, 
                    vendedores_compartidos: (prev.vendedores_compartidos || []).filter(id => id?.toString() !== e.target.value?.toString())
                  }));
                }} required disabled={isFieldsDisabled}>
            <option value="">Seleccionar vendedor</option>
            {(vendedores || []).map(vendedor => (
              <option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>
            ))}
          </select>
        </div>

        {formData.vendedor_id && !isFieldsDisabled && (
          <div className="form-group full-width">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={showSharedVendors || ((formData.vendedores_compartidos || []).length > 0)} 
                onChange={(e) => setShowSharedVendors(e.target.checked)} 
              /> 
              Venta Compartida (Opcional)
            </label>
            {(showSharedVendors || ((formData.vendedores_compartidos || []).length > 0)) && (
              <div className="shared-vendors-box">
                {(vendedores || []).filter(v => v.id?.toString() !== formData.vendedor_id?.toString()).map(v => (
                  <label key={v.id} style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 0}}>
                    <input 
                      type="checkbox" 
                      value={v.id} 
                      checked={(formData.vendedores_compartidos || []).includes(v.id) || (formData.vendedores_compartidos || []).includes(v.id?.toString())}
                      onChange={(e) => {
                        if(e.target.checked) {
                          setFormData(prev => ({...prev, vendedores_compartidos: [...(prev.vendedores_compartidos || []), v.id]}));
                        } else {
                          setFormData(prev => ({...prev, vendedores_compartidos: (prev.vendedores_compartidos || []).filter(id => id?.toString() !== v.id?.toString())}));
                        }
                      }}
                    /> {v.first_name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-group checkbox-inline">
          <input type="checkbox" id="traslado" name="traslado" checked={formData.traslado} onChange={handleChange} disabled={isFieldsDisabled} />
          <label htmlFor="traslado">¿Incluye Traslado?</label>
        </div>
        <div className="form-group checkbox-inline">
          <input type="checkbox" id="estado_pedidos" name="estado_pedidos" checked={formData.estado_pedidos} onChange={handleChange} disabled={isEstadoPedidosDisabled} />
          <label htmlFor="estado_pedidos">¿Estado de Pedidos?</label>
        </div>

        <div className="form-group">
          <label>Valor Total:</label>
          <input type="number" name="valor_total" value={formData.valor_total} onChange={handleChange} required disabled={isFieldsDisabled} />
        </div>
        <div className="form-group">
          <label>Estado de Venta:</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
            disabled={isEstadoDisabled}
          >
            {(availableEstados || []).map(estado => (
              <option key={estado} value={estado}>{estado.charAt(0).toUpperCase() + estado.slice(1).replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="edit-sale-modal-actions">
          <button type="submit" className="v-btn-primary-glow" style={{ minWidth: '160px', height: '44px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            Guardar Cambios
          </button>
        </div>
      </form>
    </Modal>
  );

};

export default EditSaleModal;