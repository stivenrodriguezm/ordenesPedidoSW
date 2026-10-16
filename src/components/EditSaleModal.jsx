import React, { useState, useEffect, useContext } from 'react';
import './EditSaleModal.css';
import Modal from './Modal';
import { Button } from './ui';
import { useQueryClient } from '@tanstack/react-query';
import { AppContext, usePermissions } from '../AppContext';
import API from '../services/api';
import { mensajeDeError } from '../services/errores';

const EditSaleModal = ({ show, onClose, saleData, vendedores, estados, onSaleUpdated, setNotification, fetchVentas, fetchReportSales }) => {
  const { usuario } = useContext(AppContext);
  const queryClient = useQueryClient();
  const [showSharedVendors, setShowSharedVendors] = useState(false);
  // Copia del estado cargado, para avisar antes de descartar cambios (U02).
  const [formInicial, setFormInicial] = useState('');
  const [formData, setFormData] = useState({
    id: '',
    cliente_id: '',
    fecha_venta: '',
    vendedor_id: '',
    vendedores_compartidos: [],
    traslado: false,
    sede: 'Lottus 1',
    es_feria_hogar: false,
    es_postferia: false,
    valor_total: '',
    estado: '',
    estado_pedidos: false,
  });

  useEffect(() => {
    if (saleData) {
      const inicial = {
        id: saleData.id,
        cliente_id: saleData.cliente?.id || '',
        fecha_venta: saleData.fecha_venta,
        fecha_entrega: saleData.fecha_entrega || '', // Add fecha_entrega
        vendedor_id: saleData.vendedor || '',
        vendedores_compartidos: saleData.vendedores_compartidos || [],
        traslado: saleData.traslado || false,
        sede: saleData.sede || '',
        es_feria_hogar: saleData.es_feria_hogar || false,
        es_postferia: saleData.es_postferia || false,
        valor_total: Number.isFinite(Number(saleData.valor_total)) ? Number(saleData.valor_total) : 0,
        estado: saleData.estado,
        estado_pedidos: saleData.estado_pedidos,
      };
      setFormData(inicial);
      setFormInicial(JSON.stringify(inicial));
    }
  }, [saleData]);
  const hayCambios = Boolean(formInicial) && JSON.stringify(formData) !== formInicial;

  // --- Permissions Logic ---
  const hasPermission = usePermissions();

  const canEditEverything = hasPermission('EDITAR_VENTA') || hasPermission('ALL') || usuario?.role?.toLowerCase() === 'administrador';
  const canEditEstadoVenta = canEditEverything || hasPermission('EDITAR_ESTADO_VENTA');
  const canEditEstadoPedidos = canEditEverything || hasPermission('EDITAR_ESTADO_PEDIDOS_VENTA');

  const isEstadoDisabled = !canEditEstadoVenta || (usuario?.role?.toLowerCase() === 'auxiliar' && (formData.estado || '').trim().toLowerCase() === 'entregado');
  const isEstadoPedidosDisabled = !canEditEstadoPedidos || (usuario?.role?.toLowerCase() === 'auxiliar' && formData.estado_pedidos);

  const canAnularOrden = hasPermission('ANULAR_ORDEN_PEDIDO') || hasPermission('ALL') || usuario?.role?.toLowerCase() === 'administrador';

  // Nota: el valor real en BD para una venta anulada es 'anulada' (Venta.ESTADO_CHOICES).
  // Se compara con startsWith('anulad') en vez de una igualdad exacta para no romper
  // de nuevo si alguna vez aparece un dato legado con la forma 'anulado'.
  const availableEstados = (!canAnularOrden && !(formData.estado || '').toLowerCase().startsWith('anulad'))
    ? (estados || []).filter(e => !e.toLowerCase().startsWith('anulad'))
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
        sede: formData.es_feria_hogar ? null : (formData.sede || null),
        // Feria del Hogar ya no se marca desde Ventas: se conserva el valor de ventas antiguas.
        es_feria_hogar: formData.es_feria_hogar,
        es_postferia: formData.es_postferia,
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
      queryClient.invalidateQueries({ queryKey: ['ventasPendientes'] });
    } catch (error) {
      console.error('Error al editar la venta:', error);
      setNotification({ message: mensajeDeError(error, 'Error al editar la venta.'), type: 'error' });
    }
  };

  return (
    <Modal show={show} onClose={onClose} hayCambios={hayCambios} title="Editar Venta">
      <form onSubmit={handleSubmit} className="edit-sale-form">
        <div className="form-group">
          <label>ID Venta:</label>
          <input type="text" name="id" value={formData.id} onChange={handleChange} disabled />
        </div>
        <div className="form-group">
          <label>ID Cliente:</label>
          <input type="text" name="cliente_id" value={formData.cliente_id} onChange={handleChange} disabled />
        </div>

        {canEditEverything && (
          <>
            <div className="form-group">
              <label>Fecha de Venta:</label>
              <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} name="fecha_venta" value={formData.fecha_venta} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Fecha de Entrega:</label>
              <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} name="fecha_entrega" value={formData.fecha_entrega} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Sede:</label>
              {formData.es_feria_hogar ? (
                <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#78716c', background: '#f5f5f4', borderRadius: '6px' }}>
                  No aplica — venta de Feria del Hogar
                </div>
              ) : (
                <select name="sede" value={formData.sede} onChange={handleChange}>
                  <option value="" disabled>Seleccione una sede</option>
                  <option value="Lottus 1">Lottus 1</option>
                  <option value="Lottus 2">Lottus 2</option>
                </select>
              )}
            </div>
            <div className="form-group">
              <label>Vendedor Principal:</label>
              <select name="vendedor_id" value={formData.vendedor_id} onChange={(e) => {
                      handleChange(e);
                      setFormData(prev => ({
                        ...prev,
                        vendedores_compartidos: (prev.vendedores_compartidos || []).filter(id => id?.toString() !== e.target.value?.toString())
                      }));
                    }} required>
                <option value="">Seleccionar vendedor</option>
                {(vendedores || []).map(vendedor => (
                  <option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>
                ))}
              </select>
            </div>

            {formData.vendedor_id && (
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
              <input type="checkbox" id="traslado" name="traslado" checked={formData.traslado} onChange={handleChange} />
              <label htmlFor="traslado">¿Incluye Traslado?</label>
            </div>
            <div className="form-group checkbox-inline">
              <input type="checkbox" id="es_postferia" name="es_postferia" checked={formData.es_postferia} onChange={handleChange} />
              <label htmlFor="es_postferia">Postferia</label>
            </div>

            <div className="form-group">
              <label>Valor Total:</label>
              <input type="number" name="valor_total" value={formData.valor_total} onChange={handleChange} required />
            </div>
          </>
        )}

        {canEditEstadoPedidos && (
          <div className="form-group">
            <label title="Ajuste manual; lo normal es finalizarla desde Productos de la venta">Gestión de la venta:</label>
            <select
              name="estado_pedidos"
              value={formData.estado_pedidos ? 'true' : 'false'}
              onChange={(e) => setFormData(prev => ({ ...prev, estado_pedidos: e.target.value === 'true' }))}
              disabled={isEstadoPedidosDisabled}
            >
              <option value="false">Pendiente</option>
              <option value="true">Finalizada</option>
            </select>
            {isEstadoPedidosDisabled && (
              <small className="form-hint">Ya está marcado como pedido; revertirlo requiere un rol con edición completa.</small>
            )}
          </div>
        )}

        {canEditEstadoVenta && (
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
            {isEstadoDisabled && (
              <small className="form-hint">Una venta entregada solo la puede cambiar de estado un rol con edición completa.</small>
            )}
          </div>
        )}

        {(canEditEverything || canEditEstadoVenta || canEditEstadoPedidos) ? (
          <div className="edit-sale-modal-actions">
            <Button type="submit" style={{ minWidth: '160px' }}>
              Guardar Cambios
            </Button>
          </div>
        ) : (
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>No tienes permisos para editar esta venta.</p>
        )}
      </form>
    </Modal>
  );

};

export default EditSaleModal;