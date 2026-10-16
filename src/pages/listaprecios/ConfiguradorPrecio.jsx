import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaCheck, FaMinus, FaPlus, FaShoppingCart, FaTimes } from 'react-icons/fa';
import FotoPrecio from './FotoPrecio';
import { Modal, Button } from '../../components/ui';
import { getPrecioVariante } from '../../services/listaPreciosService';
import { filaDeGrupo, precioValido } from '../../utils/consultaPrecios';
import { mostrarPesos } from '../../utils/capturaPrecios';
import { formatCOP } from '../../utils/formatCOP';

// «Opcional habilitado»: el opcional aparece ya seleccionado (si aplica al material elegido).
const preseleccion = (variante, grupo) => (variante?.opcionales || [])
  .filter((o) => o.preseleccionado && (!o.precios || o.precios.some((p) => p.grupo === grupo)))
  .map((o) => o.id).sort((a, b) => a - b);

export default function ConfiguradorPrecio({ linea, inicial, onClose, onAgregar, onVerCotizacion, confirmando = false, inline = false }) {
  const primera = linea.variantes.find((v) => v.id === inicial?.varianteId) || linea.variantes[0];
  const [varianteId, setVarianteId] = useState(primera?.id);
  const [grupoId, setGrupoId] = useState(inicial ? inicial.grupoId : primera?.precios?.[0]?.grupo ?? null);
  // Un ítem de la cotización conserva lo elegido; una consulta nueva parte de los habilitados.
  const [opcionalesIds, setOpcionalesIds] = useState(() => (inicial?.id ? (inicial.opcionales || []).map((o) => o.id)
    : preseleccion(primera, filaDeGrupo(primera, inicial ? inicial.grupoId : primera?.precios?.[0]?.grupo ?? null)?.grupo)));
  const [cantidad, setCantidad] = useState(inicial?.cantidad || 1);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const variante = linea.variantes.find((v) => v.id === varianteId);
  const fila = filaDeGrupo(variante, grupoId);
  const opciones = (variante?.opcionales || []).map(op => {
    const precioGrupo = op.precios?.find(p => p.grupo === fila?.grupo);
    return { ...op, valor: op.precios ? precioGrupo?.valor : op.valor, disponible: !op.precios || !!precioGrupo };
  });
  // El precio de la tarjeta ya trae los opcionales habilitados: se recalcula si hay alguno
  // elegido o si hay habilitados (quitarlos también cambia el precio).
  const calcula = opcionalesIds.length > 0 || preseleccion(variante, fila?.grupo).length > 0;
  const incompatibles = opcionalesIds.some(id => !opciones.some(op => op.id === id && op.disponible));
  const precio = useQuery({
    queryKey: ['lp-precio-variante', varianteId, fila?.grupo, opcionalesIds],
    queryFn: () => getPrecioVariante(varianteId, { grupo: fila?.grupo, opcionales: opcionalesIds }),
    enabled: !!fila && calcula && !incompatibles,
    staleTime: 0,
    retry: 1,
  });
  const calculando = calcula && precio.isFetching;
  const error = calcula && precio.isError;
  const valor = calcula ? precio.data?.precio : fila?.precio;
  const listo = !incompatibles && !!fila && precioValido(valor) && !calculando && !error && !confirmando;
  const fotos = linea.fotos || [];
  const item = {
    lineaId: linea.id, lineaNombre: linea.nombre, referenciaId: linea.referencia, varianteId, varianteNombre: variante?.nombre,
    categoriaNombre: variante?.categoria_nombre, grupoId: fila?.grupo ?? null, grupoNombre: fila?.grupo_nombre || '',
    opcionales: calcula ? precio.data?.opcionales_incluidos || [] : [],
    notas: (variante?.notas || []).join(' · '), componentes: variante?.componentes || '',
    precioUnitario: listo ? Number(valor) : null, cantidad, foto: fotos[0] || null,
    // «Cojines incluidos»: cuántos decorativos cubre por unidad, o, si es un decorativo, hasta cuánto se cubre.
    decorativosIncluidos: variante?.decorativos_incluidos || 0,
    esDecorativo: linea.es_decorativo || linea.slug === 'decorativos', topeIncluido: fila?.tope_incluido ?? null,
  };
  const elegirVariante = (v) => {
    setVarianteId(v.id);
    // Conserva el grupo si existe; si no, pide elegir, sin asumir otro precio.
    const grupo = filaDeGrupo(v, grupoId)?.grupo ?? null;
    setGrupoId(grupo);
    setOpcionalesIds(preseleccion(v, grupo));
    setMensaje('');
  };
  const cambiarGrupo = (id) => { setGrupoId(id); setMensaje(''); };

  const footer = <div className="lp-config-footer">
        <div className="lp-config-importe" aria-live="polite" aria-atomic="true">
          <small>{variante?.nombre} · {fila?.grupo_nombre || (fila ? 'Sin tela' : 'Grupo sin elegir')}</small>
          <small>{cantidad > 1 ? `Total · ${cantidad} unidades` : 'Precio de venta · COP'}</small>
          <strong>{calculando ? 'Calculando…' : confirmando ? 'Confirmando precio…' : error ? 'Precio sin confirmar' : listo ? formatCOP(Number(valor) * cantidad) : 'Elige un grupo de tela'}</strong>
          {listo && cantidad > 1 && <small>{formatCOP(valor)} por unidad</small>}
        </div>
        <div className="lp-config-acciones">
          <Button icon={FaShoppingCart} disabled={!listo} onClick={() => {
            onAgregar(item); setMensaje(inicial?.id ? 'Producto actualizado en la cotización.' : 'Agregado a la cotización.');
          }}>{inicial?.id ? 'Guardar cambio' : 'Agregar'}</Button>
        </div>
        {mensaje && <div className="lp-config-confirmacion" role="status"><FaCheck /> {mensaje}
          <button onClick={onVerCotizacion}>Ver cotización</button>
        </div>}
      </div>;
  const contenido = <>
      <div className="lp-config-resumen">
        <div className="lp-config-foto"><FotoPrecio src={fotos[fotoIdx]} alt={linea.nombre} /></div>
        <div><span className="lp-eyebrow">{variante?.componentes ? 'Conjunto de muebles' : variante?.categoria_nombre || 'Consulta rápida'}</span>
          <h3>{variante?.nombre || 'Sin productos'}</h3>
          <p>{fila?.grupo_nombre || (fila ? 'Precio único · no requiere tela' : 'Selecciona el grupo de tela')}</p>
          {variante?.componentes && <p className="lp-componentes"><FaCheck /> {variante.componentes}</p>}
        </div>
      </div>
      {fotos.length > 1 && <div className="lp-detalle-thumbs">{fotos.map((foto, i) => <button key={foto} aria-label={`Ver foto ${i + 1}`} aria-pressed={fotoIdx === i}
        className={`lp-thumb ${fotoIdx === i ? 'lp-thumb--active' : ''}`} onClick={() => setFotoIdx(i)}><img src={foto} alt="" loading="lazy" /></button>)}</div>}
      <section className="lp-config-section" aria-label={linea.referencia ? "Subcategoría" : "Producto y medida"}>
        <h4><span>1</span> {linea.referencia ? "Subcategoría" : "Producto y medida"}</h4>
        <div className="lp-variantes">{linea.variantes.map((v) => <button key={v.id} className={`lp-variante-opcion ${v.id === varianteId ? 'is-selected' : ''}`}
          aria-pressed={v.id === varianteId} onClick={() => elegirVariante(v)}>
          <span>{v.nombre}{v.componentes && <small>Conjunto · {v.componentes}</small>}</span>
          {v.id === varianteId && <FaCheck aria-hidden="true" />}
        </button>)}</div>
      </section>
      <section className="lp-config-section" aria-label="Grupo de tela">
        <h4><span>2</span> {variante?.precios?.every((p) => p.grupo == null) ? 'Precio único' : 'Grupo de tela o cuero'}</h4>
        <div className="lp-telas">{(variante?.precios || []).map((p) => <button key={p.grupo ?? 'unico'}
          className={`lp-tela-opcion ${fila === p ? 'is-selected' : ''}`} aria-pressed={fila === p} onClick={() => cambiarGrupo(p.grupo)}>
          <span>{p.grupo_nombre || 'Sin tela'}</span><strong>{precioValido(p.precio) ? formatCOP(p.precio) : 'Sin precio'}</strong>
        </button>)}</div>
        <p className="lp-ayuda">{variante?.componentes ? 'El grupo de tela aplica a las piezas tapizadas del conjunto.' : 'Precios base por unidad. Los adicionales se calculan aparte.'}</p>
        {(linea.es_decorativo || linea.slug === 'decorativos') && <p className="lp-ayuda">Decorativo: si la cotización lleva un producto con «Cojines incluidos», va sin cobro hasta su precio en grupo 2{fila?.tope_incluido != null && fila.tope_incluido < fila.precio ? ` (aquí cubre ${formatCOP(fila.tope_incluido)})` : ''}.</p>}
        {!fila && <p className="lp-aviso" role="status">Esta medida no ofrece el grupo anterior. Elige uno disponible para confirmar el precio.</p>}
      </section>
      {(!!variante?.opcionales?.length || variante?.decorativos_incluidos > 0) && <section className="lp-config-section" aria-label="Adicionales">
        <h4>Adicionales <small>{variante?.opcionales?.length ? 'Opcional' : 'Incluido'}</small></h4>
        <div className="lp-opcionales-chips">{variante?.decorativos_incluidos > 0 && <span className="lp-opcional-chip lp-opcional-chip--active lp-opcional-chip--fijo"
          title="Ya va en el precio: no se puede quitar"><FaCheck /> Decorativos x{variante.decorativos_incluidos} · incluido</span>}
          {opciones.map((op) => <button key={op.id}
          className={`lp-opcional-chip ${opcionalesIds.includes(op.id) ? 'lp-opcional-chip--active' : ''}`} aria-pressed={opcionalesIds.includes(op.id)} disabled={!op.disponible && !opcionalesIds.includes(op.id)}
          onClick={() => { setOpcionalesIds((ids) => ids.includes(op.id) ? ids.filter((id) => id !== op.id) : [...ids, op.id].sort((a, b) => a - b)); setMensaje(''); }}>
          {opcionalesIds.includes(op.id) ? <FaCheck /> : <FaPlus />} {op.descripcion}{!op.disponible && <small>No aplica a este material</small>}{op.valor != null && <small>{Number(op.valor) < 0 ? '−' : '+'}{mostrarPesos(Math.abs(Number(op.valor)))}</small>}
        </button>)}</div>
        {variante?.decorativos_incluidos > 0 && <p className="lp-ayuda">Por unidad incluye {variante.decorativos_incluidos} productos de la línea Decorativos: sin cobro en grupo 1 o 2; desde grupo 3 se cobra la diferencia. Agrégalos a la cotización y se descuentan solos.</p>}
        {incompatibles && <p className="lp-aviso" role="alert">Un especial seleccionado no tiene consumo para este material. Desactívalo o elige otro grupo antes de agregar.</p>}
        {error && <div className="lp-aviso" role="alert">No se pudo confirmar el precio de los adicionales. <button onClick={() => precio.refetch()}>Reintentar</button></div>}
      </section>}
      <div className="lp-config-cantidad"><span>Cantidad</span><div className="lp-cantidad-control">
        <button aria-label="Reducir cantidad" disabled={cantidad <= 1} onClick={() => { setCantidad((n) => n - 1); setMensaje(''); }}><FaMinus /></button>
        <output aria-label="Cantidad">{cantidad}</output>
        <button aria-label="Aumentar cantidad" disabled={cantidad >= 99} onClick={() => { setCantidad((n) => n + 1); setMensaje(''); }}><FaPlus /></button>
      </div></div>
      {variante?.notas?.length > 0 && <p className="lp-notas">{variante.notas.join(' · ')}</p>}
      {linea.notas && <p className="lp-notas lp-notas--linea">{linea.notas}</p>}
      <details className="lp-config-galeria"><summary>Ver foto del producto</summary><FotoPrecio src={fotos[fotoIdx]} alt={linea.nombre} /></details>
</>;
  if (inline) return <section className="lp-configurador lp-configurador--inline" aria-label={`Configurar ${linea.nombre}`}>
    <header className="lp-config-inline-cabecera"><div><span className="lp-eyebrow">{linea.proveedor_nombre || 'Configura y cotiza'}{linea.referencia ? ` · Ref. #${linea.referencia}` : ''}</span><h2>{linea.nombre}</h2></div>
      <button className="lp-icon-btn" aria-label="Cerrar configuración" onClick={onClose}><FaTimes /></button></header>
    <div className="lp-config-inline-cuerpo">{contenido}</div><footer className="lp-config-inline-pie">{footer}</footer>
  </section>;
  return <Modal open onClose={onClose} title={linea.proveedor_nombre ? `${linea.nombre} · ${linea.proveedor_nombre}` : linea.nombre} size="lg" className="lp-configurador" footer={footer}>{contenido}</Modal>;
}
