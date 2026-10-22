import React, { useState } from 'react';
import { FaEdit, FaFileInvoice, FaLayerGroup, FaMinus, FaPlus, FaTrash } from 'react-icons/fa';
import { Modal, Button } from '../../components/ui';
import { formatCOP } from '../../utils/formatCOP';

export default function CotizacionConsulta({ open, cart, onClose, onEditar, onGenerar, guardando, error }) {
  const [cliente, setCliente] = useState('');
  const [descuento, setDescuento] = useState('');
  const [seleccion, setSeleccion] = useState([]);
  const [nombre, setNombre] = useState('');
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const descuentoNumero = Number(descuento || 0);
  const descuentoValido = Number.isFinite(descuentoNumero) && descuentoNumero >= 0 && descuentoNumero <= cart.total * 0.25;
  const grupos = new Map();
  cart.items.forEach((item) => {
    const key = item.conjuntoId || item.id;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(item);
  });
  const seleccionActual = seleccion.filter((id) => cart.items.some((item) => item.id === id));
  return <Modal open={open} title={`Cotización · ${cart.items.length} productos`} onClose={() => { if (!guardando) onClose(); }} size="lg" className="lp-cotizacion"
    footer={<>
      <Button variant="secondary" onClick={onClose} disabled={guardando}>Seguir consultando</Button>
      <Button icon={FaFileInvoice} loading={guardando} disabled={!cart.items.length || !descuentoValido} onClick={() => onGenerar(cliente, descuentoNumero)}>Generar cotización</Button>
    </>}>
    {!cart.items.length ? <div className="lp-vacio"><FaLayerGroup /><h3>Arma la propuesta del cliente</h3><p>Agrega productos desde la consulta. Puedes cambiar telas, medidas y reunir piezas en un conjunto.</p></div> : <>
      <div className="lp-cart-list">{[...grupos].map(([key, piezas]) => <section className="lp-cart-grupo" key={key}>
        {piezas[0].conjuntoId && <div className="lp-conjunto-cabeza"><strong><FaLayerGroup /> {piezas[0].conjuntoNombre}</strong>
          <span>{formatCOP(piezas.reduce((s, p) => s + p.precioUnitario * p.cantidad - cart.descontado(p.id), 0))}</span>
          <button onClick={() => cart.desagrupar(key)} disabled={guardando}>Separar piezas</button></div>}
        {piezas.map((item) => <article key={item.id} className="lp-cart-item">
          <label className="lp-cart-seleccionar"><input type="checkbox" aria-label={`Seleccionar ${item.lineaNombre} ${item.varianteNombre}`} checked={seleccionActual.includes(item.id)}
            disabled={guardando} onChange={(e) => setSeleccion((ids) => e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} /></label>
          <div className="lp-cart-item-info"><strong>{item.lineaNombre} · {item.varianteNombre}</strong><span>{item.grupoNombre || 'Sin tela'}</span>
            {item.componentes && <span className="lp-componentes">Incluye: {item.componentes}</span>}
            {!!item.opcionales?.length && <span>{item.opcionales.map((o) => `${o.cantidad > 1 ? `${o.cantidad} × ` : ''}${o.descripcion}`).join(' · ')}</span>}
            <small>{formatCOP(item.precioUnitario)} por unidad</small>
            {item.notaVendedor && <small className="lp-cart-nota">Nota: {item.notaVendedor}</small>}
            {item.decorativosIncluidos > 0 && <small>Incluye {item.decorativosIncluidos} decorativos por unidad</small>}
            {cart.incluidos?.[item.id] && <small className="lp-incluido">{cart.incluidos[item.id].unidades} incluido{cart.incluidos[item.id].unidades > 1 ? 's' : ''} por «Cojines incluidos»: −{formatCOP(cart.incluidos[item.id].valor)}</small>}
            {cart.transportes?.[item.id] && <small className="lp-incluido">{cart.transportes[item.id].transportes === 0 ? 'Transporte incluido en el del conjunto' : `${cart.transportes[item.id].transportes} transporte${cart.transportes[item.id].transportes > 1 ? 's' : ''} para ${item.cantidad} unidades`}: −{formatCOP(cart.transportes[item.id].valor)}</small>}</div>
          <strong className="lp-cart-item-precio">{formatCOP(item.precioUnitario * item.cantidad - cart.descontado(item.id))}</strong>
          <div className="lp-cart-item-controles"><div className="lp-cantidad-control">
            <button aria-label={`Reducir cantidad de ${item.varianteNombre}`} disabled={guardando || item.cantidad <= 1} onClick={() => cart.actualizarCantidad(item.id, item.cantidad - 1)}><FaMinus /></button>
            <output>{item.cantidad}</output><button aria-label={`Aumentar cantidad de ${item.varianteNombre}`} disabled={guardando || item.cantidad >= 99} onClick={() => cart.actualizarCantidad(item.id, item.cantidad + 1)}><FaPlus /></button>
          </div><button className="lp-icon-btn" aria-label={`Editar ${item.lineaNombre} ${item.varianteNombre}`} disabled={guardando} onClick={() => onEditar(item)}><FaEdit /></button>
            <button className="lp-icon-btn" aria-label={`Quitar ${item.lineaNombre} ${item.varianteNombre}`} disabled={guardando} onClick={() => cart.quitarItem(item.id)}><FaTrash /></button></div>
        </article>)}
      </section>)}</div>
      <div className="lp-armar-conjunto"><h4><FaLayerGroup /> Reunir piezas en un conjunto</h4><p className="lp-ayuda">Selecciona dos o más productos arriba, por ejemplo una mesa y sus sillas o las piezas de una alcoba.</p>
        <div><input className="ds-input" aria-label="Nombre del conjunto" placeholder="Ej.: Comedor del cliente" maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={guardando} />
          <Button variant="secondary" disabled={guardando || seleccionActual.length < 2 || !nombre.trim()} onClick={() => {
            cart.agrupar(seleccionActual, nombre.trim()); setSeleccion([]); setNombre('');
          }}>Agrupar ({seleccionActual.length})</Button></div></div>
      <div className="lp-cotizacion-datos"><label className="ds-field">Cliente (opcional)<input className="ds-input" value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={200} disabled={guardando} placeholder="Nombre del cliente" /></label>
        <label className="ds-field">Descuento en pesos<input className="ds-input" type="number" inputMode="numeric" min="0" max={cart.total * 0.25} value={descuento} onChange={(e) => setDescuento(e.target.value)} disabled={guardando} placeholder="0" />
          <small>Tope estándar: {formatCOP(cart.total * 0.25)} (25%).</small></label></div>
      {!descuentoValido && <p className="lp-aviso" role="alert">El descuento debe estar entre cero y el tope permitido.</p>}
      <div className="lp-cotizacion-total">{(cart.incluido > 0 || cart.transporteCompartido > 0) && <div><span>Productos</span><span>{formatCOP(cart.bruto)}</span></div>}
        {cart.incluido > 0 && <div><span>Decorativos incluidos</span><span>−{formatCOP(cart.incluido)}</span></div>}
        {cart.transporteCompartido > 0 && <div><span>Transporte compartido</span><span>−{formatCOP(cart.transporteCompartido)}</span></div>}
        <div><span>Subtotal</span><span>{formatCOP(cart.total)}</span></div>
        {descuentoNumero > 0 && <div><span>Descuento</span><span>−{formatCOP(descuentoNumero)}</span></div>}
        <div><strong>Total de la propuesta</strong><strong>{formatCOP(Math.max(0, cart.total - (descuentoValido ? descuentoNumero : 0)))}</strong></div></div>
      {error && <p className="lp-aviso" role="alert">{error}</p>}
      <div className="lp-vaciar">{confirmarVaciar ? <><span>¿Quitar todos los productos?</span><Button variant="danger-soft" onClick={cart.vaciar} disabled={guardando}>Sí, vaciar</Button><Button variant="ghost" onClick={() => setConfirmarVaciar(false)}>Cancelar</Button></>
        : <Button variant="ghost" icon={FaTrash} onClick={() => setConfirmarVaciar(true)} disabled={guardando}>Vaciar cotización</Button>}</div>
    </>}
  </Modal>;
}
