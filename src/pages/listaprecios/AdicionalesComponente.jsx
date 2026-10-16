import React, { useId, useState } from 'react';
import { FaBookOpen, FaStar, FaTrash } from 'react-icons/fa';
import { Button } from '../../components/ui';
import { BibliotecaEspeciales, CamposConfiguracion } from './JuegosEspeciales';
import { borradorEspecial } from './configuracionEspecial';

function EspecialComponente({ especial, onChange, onQuitar, errores = {}, general }) {
  const [abierto, setAbierto] = useState(!!especial.abrirInicial), nombreId = useId();
  return <details className="lp-pieza-especial" open={abierto} onToggle={e => setAbierto(e.currentTarget.open)}>
    <summary><FaStar aria-hidden="true" /> {especial.nombre || 'Nuevo especial'}{Object.keys(errores).length > 0 && <span>Revisa los campos</span>}</summary>
    <div className="lp-pieza-especial-nombre"><label htmlFor={nombreId}>Nombre del especial<input id={nombreId} value={especial.nombre} maxLength={120} onChange={e => onChange({ ...especial, nombre: e.target.value })} aria-invalid={!!errores.nombre} /></label><button type="button" className="lp-agrupacion-quitar" aria-label={`Quitar especial ${especial.nombre || 'nuevo'}`} onClick={onQuitar}><FaTrash aria-hidden="true" /></button></div>
    {errores.nombre && <p role="alert" className="lp-agrupacion-error">{errores.nombre}</p>}
    <CamposConfiguracion form={especial.form} general={general} errores={errores} onChange={form => onChange({ ...especial, form })} />
  </details>;
}

/** Especiales de una pieza que solo existen en este conjunto. Los cargos de la pieza son los
 *  del producto original y se editan con CargosVariante (2026-10-15). */
export default function AdicionalesComponente({ valor = [], onChange, errores = {}, general }) {
  const [biblioteca, setBiblioteca] = useState(false);
  const modificar = (i, a) => onChange(valor.map((anterior, j) => j === i ? a : anterior));
  const quitar = i => onChange(valor.filter((_, j) => j !== i));
  return <div className="lp-pieza-adicionales">
    {valor.map((a, i) => <EspecialComponente key={i} especial={a} general={general} errores={errores[i]} onChange={copia => modificar(i, copia)} onQuitar={() => quitar(i)} />)}
    <div className="lp-pieza-adicionales-acciones">
      <Button size="sm" variant="ghost" icon={FaStar} onClick={() => onChange([...valor, { tipo: 'especial', nombre: '', form: borradorEspecial(), abrirInicial: true }])}>Nuevo especial</Button>
      <Button size="sm" variant="ghost" icon={FaBookOpen} onClick={() => setBiblioteca(true)}>Usar especial guardado</Button>
    </div>
    {biblioteca && <BibliotecaEspeciales onClose={() => setBiblioteca(false)} onElegir={e => { onChange([...valor, { tipo: 'especial', nombre: e.nombre, form: borradorEspecial(e.configuracion), abrirInicial: true }]); setBiblioteca(false); }} />}
  </div>;
}
