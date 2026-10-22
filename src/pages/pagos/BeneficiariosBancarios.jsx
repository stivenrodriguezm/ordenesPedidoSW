import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaChevronRight, FaSearch, FaUniversity } from 'react-icons/fa';
import { Button, Modal } from '../../components/ui';
import { usePermissions } from '../../AppContext';
import { mensajeDeError } from '../../services/errores';
import * as api from '../../services/pagosBancariosService';
import CuentasBancarias from './CuentasBancarias';

export default function BeneficiariosBancarios({ configurarNomina }) {
    const permisos = usePermissions();
    const [buscar, setBuscar] = useState('');
    const [tipo, setTipo] = useState('');
    const [abierto, setAbierto] = useState(null);
    const q = useQuery({ queryKey: ['pagos', 'beneficiarios'], queryFn: api.beneficiarios });
    const visibles = (q.data || []).filter(b => (!tipo || b.tipo === tipo) && b.nombre.toLocaleLowerCase('es').includes(buscar.toLocaleLowerCase('es')));
    return <section className="pb-card pb-directory">
        <div className="pb-section-title"><div><h2>Beneficiarios y cuentas</h2><p className="pb-muted">Busca a quién le pagas y administra sus cuentas bancarias.</p></div>{permisos('GESTIONAR_NOMINA') && <Button variant="secondary" onClick={() => configurarNomina()}>Configurar personal de nómina</Button>}</div>
        <div className="pb-directory-filters"><label className="pb-search"><FaSearch /><input className="ds-input" aria-label="Buscar beneficiario" placeholder="Nombre del proveedor o empleado" value={buscar} onChange={e => setBuscar(e.target.value)} /></label><select className="ds-input" aria-label="Tipo de beneficiario" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos los beneficiarios</option>{[...new Set(q.data?.map(b => b.tipo))].map(t => <option key={t}>{t}</option>)}</select></div>
        {q.error && <p role="alert" className="pb-error">{mensajeDeError(q.error)}</p>}{q.isPending ? <p role="status">Cargando beneficiarios…</p> : <div className="pb-directory-list">{visibles.map(b => <button className="pb-beneficiary" key={b.clave} onClick={() => b.tipo === 'Nómina' && !b.usuario && permisos('GESTIONAR_NOMINA') ? configurarNomina(b.titular.empleado) : setAbierto(b)}><span className="pb-beneficiary-icon"><FaUniversity /></span><span><strong>{b.nombre}</strong><small>{b.tipo}{b.tipo === 'Nómina' ? b.usuario ? ` · ${b.usuario_nombre || 'Usuario vinculado'}` : ' · Vincular usuario' : ''}</small></span><span className="pb-beneficiary-banks"><strong>{b.cuentas ? `${b.cuentas} cuenta${b.cuentas === 1 ? '' : 's'}` : 'Agregar cuenta'}</strong><small>{b.bancos.join(' · ') || 'Sin cuentas asociadas'}</small></span><FaChevronRight /></button>)}{!visibles.length && <p className="pb-empty">No hay beneficiarios con esa búsqueda.</p>}</div>}
        {abierto && <Modal open title={`Cuentas · ${abierto.nombre}`} size="lg" onClose={() => setAbierto(null)}><CuentasBancarias titular={abierto.titular} nombre={abierto.nombre} editable={abierto.tipo === 'Nómina' ? permisos('GESTIONAR_NOMINA') : permisos('ADMINISTRAR_PROVEEDORES') || permisos('CREAR_COMPROBANTE_EGRESO')} /></Modal>}
    </section>;
}
