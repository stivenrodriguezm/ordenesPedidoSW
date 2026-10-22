import React, { useContext, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppContext } from '../../AppContext';
import API from '../../services/api';
import { mensajeDeError } from '../../services/errores';
import { Button, Modal } from '../../components/ui';
import SelectorSubcategorias from './SelectorSubcategorias';
import { useSubcategorias } from './maestroSubcategorias';
import './NuevaReferencia.css';

/** Nueva referencia desde Administrar lista (2026-10-21): nombre, proveedor y sus
 *  subcategorías en un solo paso (si una no existe, se crea ahí); las categorías salen de
 *  las subcategorías elegidas.
 *  Se guarda en Referencias (el mismo maestro), sin precios: luego se capturan sus costos. */
export default function NuevaReferencia({ onClose, onCreada, notify }) {
  const client = useQueryClient();
  const { proveedores = [], fetchProveedores } = useContext(AppContext) || {};
  const [nombre, setNombre] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [elegidas, setElegidas] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { if (!proveedores.length) fetchProveedores?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const subcategorias = useSubcategorias();
  const crear = useMutation({
    mutationFn: () => {
      const subs = (subcategorias.data || []).filter((s) => elegidas.includes(s.id));
      return API.post('referencias/', { nombre: nombre.trim(), proveedor: Number(proveedor), subcategorias: elegidas,
        categorias: [...new Set(subs.map((s) => s.categoria))] }).then((r) => r.data);
    },
    onSuccess: async (ref) => {
      await Promise.all([client.invalidateQueries({ queryKey: ['lp-referencias'] }), client.invalidateQueries({ queryKey: ['referencias'] })]);
      notify?.(`Referencia «${ref.nombre}» creada. Ya puedes agregar sus costos.`, 'success');
      onCreada?.(ref);
    },
    onError: (e) => setError(mensajeDeError(e, 'No se pudo crear la referencia. Revisa los datos.')),
  });
  const enviar = (e) => {
    e.preventDefault(); setError('');
    if (!nombre.trim() || !proveedor) { setError('Escribe el nombre y elige el proveedor.'); return; }
    if (!elegidas.length) { setError('Elige al menos una subcategoría (los productos que tendrá en la lista).'); return; }
    crear.mutate();
  };

  return (
    <Modal open title="Nueva referencia" size="md" className="lp-admin-page lp-nueva-ref" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose} disabled={crear.isPending}>Cancelar</Button>
        <Button type="submit" form="lp-nueva-ref" loading={crear.isPending}>Crear referencia</Button></>}>
      <form id="lp-nueva-ref" onSubmit={enviar} noValidate>
        <div className="lp-nueva-ref__fila">
          <label>Nombre<input className="ds-input" value={nombre} maxLength={150} placeholder="Ej.: Valencia" autoFocus onChange={(e) => setNombre(e.target.value)} /></label>
          <label>Proveedor<select className="ds-input" value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
            <option value="">Seleccionar…</option>
            {[...proveedores].sort((a, b) => (a.nombre_empresa || '').localeCompare(b.nombre_empresa || '', 'es')).map((p) => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
          </select></label>
        </div>
        <SelectorSubcategorias elegidas={elegidas} onCambiar={setElegidas} />
        {error && <p className="ds-error-box" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
