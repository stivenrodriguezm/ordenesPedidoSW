import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FaTags, FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaImage, FaUpload,
  FaLock, FaCalculator, FaStickyNote, FaPercent, FaStar, FaRegStar, FaLayerGroup,
  FaSearch, FaTimes, FaCouch, FaFolderOpen, FaSwatchbook,
} from 'react-icons/fa';
import useDebounce from '../../hooks/useDebounce';
import {
  getCategorias, createCategoria, updateCategoria, getImpactoCategoria,
  getMultiplicadores, createMultiplicador, updateMultiplicador, deleteMultiplicador,
  getImpactoMultiplicador, simularMultiplicador, asignarMultiplicadorMasivo,
  getGruposTela, createGrupoTela, updateGrupoTela, deleteGrupoTela, getImpactoGrupoTela,
  getLineas, getLinea, createLinea, updateLinea, deleteLinea,
  createVariante, updateVariante, deleteVariante,
  createPrecioVariante, updatePrecioVariante, deletePrecioVariante,
  uploadListaPreciosFoto,
} from '../../services/listaPreciosService';
import { PageHeader, Button, Modal, Badge } from '../../components/ui';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { mostrarPesos as formatCOP } from '../../utils/capturaPrecios';
import invalidarListaPrecios from './invalidarListaPrecios';
import AppNotification from '../../components/AppNotification';
import { mensajeDeError } from '../../services/errores';
import CampoPrecio, { ConsumoMaterial } from './CampoPrecio';
import { EspecialesLinea } from './JuegosEspeciales';
import VariantesOrdenables from './VariantesOrdenables';
import AgrupacionVariante from './AgrupacionVariante';
import CargosVariante from './CargosVariante';
import './ListaPreciosAdminPage.css';

// Secciones, de la más usada a la menos usada (2026-10-15).
const TABS = [
  { id: 'lineas', label: 'Líneas y Detalles', desc: 'Productos y sus precios', icon: FaLayerGroup },
  { id: 'matriz', label: 'Matriz de Grupos', desc: 'Precio por metro o decímetro', icon: FaSwatchbook },
  { id: 'multiplicadores', label: 'Multiplicadores', desc: 'Margen de venta', icon: FaPercent },
  { id: 'categorias', label: 'Categorías', desc: 'Tipos de producto', icon: FaFolderOpen },
];
const CLAVE_PESTANA = 'lp-admin-pestana';
const pestanaGuardada = () => {
  try { const t = sessionStorage.getItem(CLAVE_PESTANA); return TABS.some((x) => x.id === t) ? t : 'lineas'; } catch { return 'lineas'; }
};

// Barra de secciones: un resaltado se desliza hasta la activa; en celular, píldoras deslizables.
function PestanasAdmin({ activa, onCambiar }) {
  const pista = useRef(null);
  const [marca, setMarca] = useState(null);
  useLayoutEffect(() => {
    const medir = () => {
      const b = pista.current?.querySelector(`[data-tab="${activa}"]`);
      if (!b) return;
      setMarca({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight });
      const p = pista.current;
      if (p.scrollWidth > p.clientWidth) p.scrollTo?.({ left: b.offsetLeft - 12, behavior: 'smooth' });
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [activa]);
  const teclas = (e) => {
    const i = TABS.findIndex((t) => t.id === activa);
    const salto = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (salto == null) return;
    e.preventDefault();
    const sig = TABS[(i + salto + TABS.length) % TABS.length].id;
    onCambiar(sig);
    pista.current?.querySelector(`[data-tab="${sig}"]`)?.focus();
  };
  return (
    <nav className="lp-pestanas" aria-label="Secciones de la lista de precios">
      <div className="lp-pestanas__pista" role="tablist" ref={pista} onKeyDown={teclas}>
        {marca && <span className="lp-pestanas__marca" aria-hidden="true"
          style={{ width: marca.w, height: marca.h, transform: `translate(${marca.x}px, ${marca.y}px)` }} />}
        {TABS.map(({ id, label, desc, icon: Icono }) => (
          <button key={id} type="button" role="tab" id={`lp-tab-${id}`} data-tab={id} aria-selected={activa === id} aria-controls="lp-admin-panel"
            tabIndex={activa === id ? 0 : -1} className={`lp-pestana${activa === id ? ' is-activa' : ''}`} onClick={() => onCambiar(id)}>
            <span className="lp-pestana__icono"><Icono aria-hidden="true" /></span>
            <span className="lp-pestana__texto"><strong>{label}</strong><small>{desc}</small></span>
          </button>
        ))}
      </div>
    </nav>
  );
}

const fmtMult = (v) => Number(v).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 3 });

// ─── Categorías ─────────────────────────────────────────────────────────────

function CategoriaFormModal({ isOpen, onClose, categoria, onSave, isLoading }) {
  const [form, setForm] = useState({ nombre: '', orden: 0, activo: true });

  useEffect(() => {
    if (categoria) {
      setForm({ nombre: categoria.nombre, orden: categoria.orden, activo: categoria.activo });
    } else {
      setForm({ nombre: '', orden: 0, activo: true });
    }
  }, [categoria, isOpen]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={categoria ? 'Editar Categoría' : 'Nueva Categoría'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="lp-categoria-form" loading={isLoading}>
            {categoria ? 'Guardar Cambios' : 'Crear Categoría'}
          </Button>
        </>
      }
    >
      <form
        id="lp-categoria-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ id: categoria?.id, nombre: form.nombre, orden: parseInt(form.orden, 10) || 0, activo: form.activo });
        }}
      >
        <div className="ds-field">
          <label className="ds-label">Nombre</label>
          <input className="ds-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <p className="ds-field__hint">
          El multiplicador de margen ya no se define aquí — ve a la pestaña "Multiplicadores" para crearlos y
          asignarlos a las variantes de esta categoría.
        </p>
        <div className="ds-field">
          <label className="ds-label">Orden</label>
          <input className="ds-input" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
        </div>
        <div className="ds-field lp-checkbox-field">
          <label>
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Activa (visible en el catálogo de vendedor)
          </label>
        </div>
      </form>
    </Modal>
  );
}

function CategoriasTab({ notify }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [impacto, setImpacto] = useState(null);

  const { data: categorias = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['lp-categorias'], queryFn: getCategorias,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...data }) => (id ? updateCategoria(id, data) : createCategoria(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lp-categorias'] });
      queryClient.invalidateQueries({ queryKey: ['lp-categorias-publicas'] });
      setModalOpen(false);
      notify(`Categoría ${editing ? 'actualizada' : 'creada'} exitosamente.`, 'success');
    },
    onError: (err) => notify(err.response?.data?.nombre?.[0] || err.response?.data?.detail || 'Error al guardar la categoría.', 'error'),
  });

  const verImpacto = async (categoria) => {
    try {
      const data = await getImpactoCategoria(categoria.id);
      setImpacto({ categoria, ...data });
    } catch {
      notify('No se pudo calcular el impacto.', 'error');
    }
  };

  if (isLoading) return <div className="lp-loading">Cargando categorías...</div>;
  if (isError) return <ErrorState message="No se pudieron cargar las categorías." onRetry={refetch} />;

  return (
    <div>
      <div className="lp-tab-toolbar">
        <Button icon={FaPlus} onClick={() => { setEditing(null); setModalOpen(true); }}>Nueva Categoría</Button>
      </div>
      <div className="ordenes-container ds-card">
        <div className="desktop-view">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Estado</th><th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.length === 0 ? (
                <tr><td colSpan="3" className="empty-cell">Sin categorías.</td></tr>
              ) : categorias.map((cat) => (
                <tr key={cat.id}>
                  <td><span className="product-name">{cat.nombre}</span></td>
                  <td>{cat.activo ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}</td>
                  <td>
                    <div className="lp-row-actions">
                      <button className="action-btn" title="Ver impacto" onClick={() => verImpacto(cat)}><FaCalculator size={14} /></button>
                      <button className="action-btn" title="Editar" onClick={() => { setEditing(cat); setModalOpen(true); }}><FaEdit size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CategoriaFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        categoria={editing}
        isLoading={saveMutation.isPending}
        onSave={(data) => saveMutation.mutate(data)}
      />

      <Modal open={!!impacto} onClose={() => setImpacto(null)} title="Impacto de esta categoría" size="sm">
        {impacto && (
          <div>
            <p><strong>{impacto.categoria.nombre}</strong> tiene {impacto.lineas_afectadas} línea(s) y {impacto.variantes_afectadas} variante(s) en total.</p>
            <p className="lp-section-hint">
              La categoría ya no define ningún precio — solo agrupa/etiqueta el tipo de mueble. El precio por metro
              de cada grupo de tela es el mismo para cualquier categoría (pestaña "Matriz de Grupos"), y el
              multiplicador de margen se asigna por variante desde "Multiplicadores" (individualmente o en lote por
              categoría).
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Multiplicadores ────────────────────────────────────────────────────────

function MultiplicadorFormModal({ isOpen, onClose, multiplicador, onSave, isLoading }) {
  const [form, setForm] = useState({ nombre: '', valor: '1.76', es_general: false, orden: 0 });

  useEffect(() => {
    if (multiplicador) {
      setForm({
        nombre: multiplicador.nombre, valor: String(multiplicador.valor),
        es_general: multiplicador.es_general, orden: multiplicador.orden,
      });
    } else {
      setForm({ nombre: '', valor: '1.76', es_general: false, orden: 0 });
    }
  }, [multiplicador, isOpen]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={multiplicador ? 'Editar Multiplicador' : 'Nuevo Multiplicador'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="lp-multiplicador-form" loading={isLoading}>
            {multiplicador ? 'Guardar Cambios' : 'Crear Multiplicador'}
          </Button>
        </>
      }
    >
      <form
        id="lp-multiplicador-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: multiplicador?.id,
            nombre: form.nombre,
            valor: form.valor,
            es_general: form.es_general,
            orden: parseInt(form.orden, 10) || 0,
          });
        }}
      >
        <div className="ds-field">
          <label className="ds-label">Nombre</label>
          <input
            className="ds-input" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: General, Promoción, Distribuidor..." required
          />
        </div>
        <div className="ds-field">
          <label className="ds-label">Valor</label>
          <input
            className="ds-input" type="number" step="0.001" value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })} required
          />
        </div>
        <div className="ds-field">
          <label className="ds-label">Orden</label>
          <input className="ds-input" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
        </div>
        <div className="ds-field lp-checkbox-field">
          <label>
            <input type="checkbox" checked={form.es_general} onChange={(e) => setForm({ ...form, es_general: e.target.checked })} />
            Es el multiplicador general (por defecto para las variantes sin uno asignado)
          </label>
        </div>
        {form.es_general && (
          <p className="ds-field__hint">
            Al marcarlo como general, se desmarcará automáticamente el multiplicador que actualmente lo sea.
          </p>
        )}
      </form>
    </Modal>
  );
}

function AsignarMultiplicadorModal({ isOpen, onClose, multiplicador, notify }) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState('categoria');
  const [categoriaId, setCategoriaId] = useState('');
  const [lineaId, setLineaId] = useState('');

  const { data: categorias = [] } = useQuery({ queryKey: ['lp-categorias'], queryFn: getCategorias, enabled: isOpen });
  const { data: lineas = [] } = useQuery({ queryKey: ['lp-lineas'], queryFn: () => getLineas(), enabled: isOpen });

  useEffect(() => {
    if (isOpen) { setScope('categoria'); setCategoriaId(''); setLineaId(''); }
  }, [isOpen, multiplicador]);

  const asignarMutation = useMutation({
    mutationFn: (data) => asignarMultiplicadorMasivo(data),
    onSuccess: (data) => {
      invalidarListaPrecios(queryClient);
      queryClient.invalidateQueries({ queryKey: ['lp-multiplicadores'] });
      notify(`Multiplicador aplicado a ${data.actualizadas} variante(s).`, 'success');
      onClose();
    },
    onError: (err) => notify(err.response?.data?.detail || 'Error al aplicar el multiplicador.', 'error'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { multiplicador: multiplicador.id };
    if (scope === 'categoria') {
      if (!categoriaId) return notify('Selecciona una categoría.', 'error');
      payload.categoria = categoriaId;
    } else {
      if (!lineaId) return notify('Selecciona una línea.', 'error');
      payload.linea = lineaId;
    }
    asignarMutation.mutate(payload);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={multiplicador ? `Aplicar "${multiplicador.nombre}" en lote` : 'Aplicar en lote'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="lp-asignar-form" loading={asignarMutation.isPending}>Aplicar</Button>
        </>
      }
    >
      {multiplicador && (
        <form id="lp-asignar-form" onSubmit={handleSubmit}>
          <p className="ds-field__hint">
            Todas las variantes del alcance elegido pasarán a usar el multiplicador <strong>{multiplicador.nombre}</strong> (×{fmtMult(multiplicador.valor)}).
          </p>
          <div className="ds-field">
            <label className="ds-label">Aplicar por</label>
            <select className="ds-input" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="categoria">Categoría (todos sus detalles)</option>
              <option value="linea">Línea de producto (todos sus detalles)</option>
            </select>
          </div>
          {scope === 'categoria' ? (
            <div className="ds-field">
              <label className="ds-label">Categoría</label>
              <select className="ds-input" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
                <option value="">Selecciona...</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          ) : (
            <div className="ds-field">
              <label className="ds-label">Línea de producto</label>
              <select className="ds-input" value={lineaId} onChange={(e) => setLineaId(e.target.value)} required>
                <option value="">Selecciona...</option>
                {lineas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

function MultiplicadoresTab({ notify }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [impacto, setImpacto] = useState(null);
  const [simulacion, setSimulacion] = useState(null);
  const [nuevoValorSim, setNuevoValorSim] = useState('');
  const [simulando, setSimulando] = useState(false);
  const [asignando, setAsignando] = useState(null);

  const { data: multiplicadores = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['lp-multiplicadores'], queryFn: getMultiplicadores,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...data }) => (id ? updateMultiplicador(id, data) : createMultiplicador(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lp-multiplicadores'] });
      invalidarListaPrecios(queryClient);
      setModalOpen(false);
      notify(`Multiplicador ${editing ? 'actualizado' : 'creado'} exitosamente.`, 'success');
    },
    onError: (err) => notify(err.response?.data?.nombre?.[0] || err.response?.data?.detail || 'Error al guardar el multiplicador.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteMultiplicador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lp-multiplicadores'] });
      invalidarListaPrecios(queryClient);
      notify('Multiplicador eliminado.', 'success');
    },
    onError: (err) => notify(err.response?.data?.detail || 'No se pudo eliminar el multiplicador.', 'error'),
  });

  const verImpacto = async (mult) => {
    try {
      const data = await getImpactoMultiplicador(mult.id);
      setImpacto({ multiplicador: mult, ...data });
      setNuevoValorSim(mult.valor);
      setSimulacion(null);
    } catch {
      notify('No se pudo calcular el impacto.', 'error');
    }
  };

  const handleSimular = async () => {
    if (!nuevoValorSim || parseFloat(nuevoValorSim) <= 0) {
      notify('Introduce un valor de multiplicador mayor a cero.', 'error');
      return;
    }
    setSimulando(true);
    try {
      const res = await simularMultiplicador(impacto.multiplicador.id, nuevoValorSim);
      setSimulacion(res);
    } catch {
      notify('No se pudo simular el impacto.', 'error');
    } finally {
      setSimulando(false);
    }
  };

  if (isLoading) return <div className="lp-loading">Cargando multiplicadores...</div>;
  if (isError) return <ErrorState message="No se pudieron cargar los multiplicadores." onRetry={refetch} />;

  return (
    <div>
      <div className="lp-tab-toolbar">
        <Button icon={FaPlus} onClick={() => { setEditing(null); setModalOpen(true); }}>Nuevo Multiplicador</Button>
      </div>
      <p className="lp-section-hint">
        El multiplicador <strong>general</strong> es el que usan casi todos los productos por defecto. Puedes crear
        otros con el nombre que quieras y asignarlos por producto, por variante, por categoría o por línea completa.
      </p>
      <div className="ordenes-container ds-card">
        <div className="desktop-view">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Valor</th><th>General</th><th style={{ width: 200 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {multiplicadores.length === 0 ? (
                <tr><td colSpan="4" className="empty-cell">Sin multiplicadores todavía.</td></tr>
              ) : multiplicadores.map((m) => (
                <tr key={m.id}>
                  <td><span className="product-name">{m.nombre}</span></td>
                  <td>×{fmtMult(m.valor)}</td>
                  <td>{m.es_general ? <Badge tone="success"><FaStar size={11} style={{ marginRight: 4 }} />General</Badge> : <FaRegStar size={14} style={{ opacity: 0.35 }} />}</td>
                  <td>
                    <div className="lp-row-actions">
                      <button className="action-btn" title="Aplicar en lote" onClick={() => setAsignando(m)}><FaLayerGroup size={14} /></button>
                      <button className="action-btn" title="Ver impacto" onClick={() => verImpacto(m)}><FaCalculator size={14} /></button>
                      <button className="action-btn" title="Editar" onClick={() => { setEditing(m); setModalOpen(true); }}><FaEdit size={14} /></button>
                      {!m.es_general && (
                        <button
                          className="action-btn" title="Eliminar"
                          onClick={() => { if (window.confirm(`¿Eliminar el multiplicador "${m.nombre}"?`)) deleteMutation.mutate(m.id); }}
                        >
                          <FaTrash size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MultiplicadorFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        multiplicador={editing}
        isLoading={saveMutation.isPending}
        onSave={(data) => saveMutation.mutate(data)}
      />

      <AsignarMultiplicadorModal
        isOpen={!!asignando}
        onClose={() => setAsignando(null)}
        multiplicador={asignando}
        notify={notify}
      />

      <Modal open={!!impacto} onClose={() => { setImpacto(null); setSimulacion(null); }} title="Impacto y Simulación de Multiplicador" size="md">
        {impacto && (
          <div>
            <p>
              <strong>{impacto.multiplicador.nombre}</strong> (×{fmtMult(impacto.multiplicador.valor)}) afecta actualmente a{' '}
              <strong>{impacto.variantes_afectadas}</strong> variante(s)
              {impacto.multiplicador.es_general ? ' (incluye las que no tienen un multiplicador propio asignado).' : '.'}
            </p>

            <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'var(--surface, #faf9f5)', borderRadius: '6px', border: '1px solid var(--border, #e4e3dc)' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text, #2a2a25)' }}>Simular nuevo valor</h5>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  className="ds-input"
                  type="number"
                  step="0.01"
                  min="0.1"
                  style={{ width: '120px' }}
                  value={nuevoValorSim}
                  onChange={(e) => setNuevoValorSim(e.target.value)}
                  placeholder="Ej: 2.20"
                />
                <Button size="sm" variant="primary" loading={simulando} onClick={handleSimular}>
                  Simular impacto
                </Button>
              </div>

              {simulacion && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #72726a)', marginBottom: '0.5rem' }}>
                    Variantes afectadas: <strong>{simulacion.variantes_afectadas}</strong>. Mostrando {simulacion.ejemplos.length} ejemplos:
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="premium-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Precio Actual</th>
                          <th>Precio Simulado</th>
                          <th>Diferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulacion.ejemplos.map((ej, idx) => (
                          <tr key={idx}>
                            <td>{ej.linea_nombre} — {ej.variante_nombre}</td>
                            <td>{formatCOP(parseFloat(ej.precio_actual))}</td>
                            <td style={{ fontWeight: 600 }}>{formatCOP(parseFloat(ej.precio_nuevo))}</td>
                            <td style={{ color: parseFloat(ej.diferencia) >= 0 ? '#4c7a4f' : '#a8432f', fontWeight: 600 }}>
                              {parseFloat(ej.diferencia) >= 0 ? `+${formatCOP(parseFloat(ej.diferencia))}` : formatCOP(parseFloat(ej.diferencia))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Matriz de Grupos ───────────────────────────────────────────────────────

function GrupoFormModal({ isOpen, onClose, grupo, onSave, isLoading }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'tela', orden: 0 });

  useEffect(() => {
    if (grupo) {
      setForm({ nombre: grupo.nombre, tipo: grupo.tipo, orden: grupo.orden });
    } else {
      setForm({ nombre: '', tipo: 'tela', orden: 0 });
    }
  }, [grupo, isOpen]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={grupo ? 'Editar Grupo' : 'Nuevo Grupo'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="lp-grupo-form" loading={isLoading}>
            {grupo ? 'Guardar Cambios' : 'Crear Grupo'}
          </Button>
        </>
      }
    >
      <form
        id="lp-grupo-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ id: grupo?.id, nombre: form.nombre, tipo: form.tipo, orden: parseInt(form.orden, 10) || 0 });
        }}
      >
        <div className="ds-field">
          <label className="ds-label">Nombre</label>
          <input
            className="ds-input" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Cuero Nacional, Grupo 6..."
            required
          />
        </div>
        <div className="ds-field">
          <label className="ds-label">Material</label>
          <select className="ds-input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="tela">Tela (se cotiza por metro)</option>
            <option value="cuero">Cuero (se cotiza por decímetro)</option>
          </select>
        </div>
        <div className="ds-field">
          <label className="ds-label">Orden</label>
          <input className="ds-input" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}

function MatrizTab({ notify }) {
  const queryClient = useQueryClient();
  const [grupoModalOpen, setGrupoModalOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState(null);
  const [impacto, setImpacto] = useState(null);

  const { data: grupos = [], isLoading } = useQuery({ queryKey: ['lp-grupos'], queryFn: getGruposTela });

  const updatePrecioMutation = useMutation({
    mutationFn: ({ id, precio_por_metro }) => updateGrupoTela(id, { precio_por_metro }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lp-grupos'] });
      invalidarListaPrecios(queryClient);
      notify('Precio actualizado.', 'success');
    },
    onError: () => notify('Error al actualizar el precio.', 'error'),
  });

  const saveGrupoMutation = useMutation({
    mutationFn: ({ id, ...data }) => (id ? updateGrupoTela(id, data) : createGrupoTela(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lp-grupos'] });
      invalidarListaPrecios(queryClient);
      setGrupoModalOpen(false);
      notify(`Grupo ${editingGrupo ? 'actualizado' : 'creado'} exitosamente.`, 'success');
    },
    onError: (err) => notify(err.response?.data?.nombre?.[0] || err.response?.data?.detail || 'Error al guardar el grupo.', 'error'),
  });

  const deleteGrupoMutation = useMutation({
    mutationFn: (id) => deleteGrupoTela(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lp-grupos'] });
      invalidarListaPrecios(queryClient);
      setImpacto(null);
      notify('Grupo eliminado.', 'success');
    },
    onError: (err) => notify(err.response?.data?.detail || 'No se pudo eliminar el grupo.', 'error'),
  });

  const verImpactoGrupo = async (grupo) => {
    try {
      const data = await getImpactoGrupoTela(grupo.id);
      setImpacto({ grupo, ...data });
    } catch {
      notify('No se pudo calcular el impacto.', 'error');
    }
  };

  return (
    <div>
      <div className="lp-tab-toolbar">
        <Button icon={FaPlus} onClick={() => { setEditingGrupo(null); setGrupoModalOpen(true); }}>Nuevo Grupo</Button>
      </div>
      <p className="lp-section-hint">
        El precio por metro/decímetro de cada grupo es el mismo para cualquier tipo de producto — no depende de la
        categoría.
      </p>

      {isLoading ? (
        <div className="lp-loading">Cargando grupos...</div>
      ) : grupos.length === 0 ? (
        <EmptyState title="Sin grupos todavía" message='Crea el primero con "Nuevo Grupo" — ej. Grupo 1, Cuero Nacional...' />
      ) : (
        <div className="ordenes-container ds-card">
          <div className="desktop-view">
            <table className="premium-table">
              <thead>
                <tr><th>Grupo</th><th>Material</th><th style={{ width: 220 }}>Precio</th><th style={{ width: 90 }}>Acciones</th></tr>
              </thead>
              <tbody>
                {grupos.map((grupo) => {
                  const esCuero = grupo.tipo === 'cuero';
                  return (
                    <tr key={grupo.id}>
                      <td><span className="product-name">{grupo.nombre}</span></td>
                      <td><Badge tone={esCuero ? 'accent' : 'neutral'}>{esCuero ? 'Cuero' : 'Tela'}</Badge></td>
                      <td>
                        <CampoPrecio label={`Precio de ${grupo.nombre}`} valor={grupo.precio_por_metro}
                          sufijo={`/ ${grupo.unidad_medida || (esCuero ? 'decímetro' : 'metro')}`}
                          onCommit={(valor) => updatePrecioMutation.mutateAsync({ id: grupo.id, precio_por_metro: valor })} />
                      </td>
                      <td>
                        <div className="lp-row-actions">
                          <button className="action-btn" title="Ver impacto" onClick={() => verImpactoGrupo(grupo)}><FaCalculator size={14} /></button>
                          <button className="action-btn" title="Editar" onClick={() => { setEditingGrupo(grupo); setGrupoModalOpen(true); }}><FaEdit size={14} /></button>
                          <button
                            className="action-btn" title="Eliminar"
                            onClick={() => { if (window.confirm(`¿Eliminar el grupo "${grupo.nombre}"? Se borrarán también los precios propios de detalles que lo usen.`)) deleteGrupoMutation.mutate(grupo.id); }}
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GrupoFormModal
        isOpen={grupoModalOpen}
        onClose={() => setGrupoModalOpen(false)}
        grupo={editingGrupo}
        isLoading={saveGrupoMutation.isPending}
        onSave={(data) => saveGrupoMutation.mutate(data)}
      />

      <Modal open={!!impacto} onClose={() => setImpacto(null)} title="Impacto de este grupo" size="sm">
        {impacto && (
          <div>
            <p>
              <strong>{impacto.grupo.nombre}</strong> tiene{' '}
              <strong>{impacto.precios_variante_afectados}</strong> variante(s) con un precio propio fijado para
              este grupo (se pierde si lo eliminas). Además, cualquier otro producto con tela que no tenga un
              precio propio deja de poder cotizarse en este grupo.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Líneas y Variantes ─────────────────────────────────────────────────────

function FotosEditor({ fotos, onChange, notify }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      const res = await uploadListaPreciosFoto(formData);
      onChange([...(fotos || []), ...(res.urls || [])]);
    } catch {
      notify('No se pudo subir la imagen.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const mover = (idx, dir) => {
    const nuevas = [...fotos];
    const j = idx + dir;
    if (j < 0 || j >= nuevas.length) return;
    [nuevas[idx], nuevas[j]] = [nuevas[j], nuevas[idx]];
    onChange(nuevas);
  };

  const quitar = (idx) => onChange(fotos.filter((_, i) => i !== idx));

  return (
    <div className="lp-fotos-editor">
      <div className="lp-fotos-grid">
        {(fotos || []).map((url, idx) => (
          <div key={url + idx} className="lp-foto-item">
            <img src={url} alt="" />
            {idx === 0 && <span className="lp-foto-portada">Portada</span>}
            <div className="lp-foto-actions">
              <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0}>◀</button>
              <button type="button" onClick={() => quitar(idx)}>✕</button>
              <button type="button" onClick={() => mover(idx, 1)} disabled={idx === fotos.length - 1}>▶</button>
            </div>
          </div>
        ))}
        <label className="lp-foto-upload">
          <FaUpload />
          <span>{uploading ? 'Subiendo...' : 'Agregar'}</span>
          <input type="file" accept="image/*" multiple hidden onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

function NotasEditor({ notas, onChange }) {
  // Estado local controlado (no `defaultValue` por-item): las notas viven
  // en un único campo JSON en el servidor, así que cada guardado manda el
  // arreglo completo. Si "agregar"/"quitar" leyeran directo del prop
  // `notas`, dos acciones seguidas (ej. agregar dos notas rápido) podrían
  // dispararse antes de que el refetch de la primera vuelva, y la segunda
  // pisaría el arreglo con una versión desactualizada. Construir siempre
  // sobre el estado local evita esa pérdida de datos.
  const [lista, setLista] = useState(() => (Array.isArray(notas) ? notas : (notas ? [notas] : [])));
  useEffect(() => {
    setLista(Array.isArray(notas) ? notas : (notas ? [notas] : []));
  }, [notas]);

  const [nueva, setNueva] = useState('');
  const commit = (nuevas) => {
    const limpias = nuevas.map((n) => n.trim()).filter(Boolean);
    setLista(limpias);
    const guardadas = Array.isArray(notas) ? notas : (notas ? [notas] : []);
    if (JSON.stringify(limpias) !== JSON.stringify(guardadas)) onChange(limpias);
  };
  const agregar = () => {
    if (!nueva.trim()) return;
    commit([...lista, nueva]);
    setNueva('');
  };
  // El texto de cada nota crece con su contenido (sin barra de desplazamiento).
  const ajustar = (el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } };

  return (
    <div className="lp-notas">
      {lista.length > 0 && (
        <ul className="lp-notas__lista">
          {lista.map((nota, idx) => (
            <li key={idx} className="lp-nota">
              <textarea className="lp-nota__texto" rows={1} value={nota} aria-label={`Nota ${idx + 1}`} ref={ajustar}
                onChange={(e) => { const nuevas = [...lista]; nuevas[idx] = e.target.value; setLista(nuevas); ajustar(e.target); }}
                onBlur={() => commit(lista)} />
              <button type="button" className="lp-nota__quitar" aria-label={`Quitar nota ${idx + 1}`} title="Quitar nota"
                onClick={() => commit(lista.filter((_, i) => i !== idx))}>
                <FaTimes size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="lp-notas__nueva">
        <input className="lp-nota__input" value={nueva} aria-label="Nueva nota" placeholder="Nueva nota… (Enter para guardar)"
          onChange={(e) => setNueva(e.target.value)} onBlur={agregar}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } if (e.key === 'Escape') setNueva(''); }} />
        <button type="button" className="lp-nota__agregar" aria-label="Agregar nota" disabled={!nueva.trim()} onMouseDown={(e) => e.preventDefault()} onClick={agregar}>
          <FaPlus size={10} />
        </button>
      </div>
    </div>
  );
}

function VarianteEditor({ variante, linea, grupos, categorias, multiplicadores, notify }) {
  const queryClient = useQueryClient();
  const [expandido, setExpandido] = useState(false);

  const invalidar = () => invalidarListaPrecios(queryClient, linea.id);

  const updateVarianteMut = useMutation({
    scope: { id: `lp-variante-${variante.id}` },
    mutationFn: (data) => updateVariante(variante.id, data),
    // El PATCH ya confirma y devuelve los precios de esta variante. Mostrar
    // Guardado sin esperar el refresco de los conjuntos que la utilizan.
    onSuccess: data => { invalidarListaPrecios(queryClient, linea.id, data); },
    onError: () => notify('Error al actualizar el detalle.', 'error'),
  });
  const deleteVarianteMut = useMutation({
    mutationFn: () => deleteVariante(variante.id),
    onSuccess: invalidar,
    onError: () => notify('Error al eliminar el detalle.', 'error'),
  });
  const updatePrecioMut = useMutation({
    mutationFn: ({ id, ...data }) => (id ? updatePrecioVariante(id, data) : createPrecioVariante(data)),
    onSuccess: invalidar,
    onError: () => notify('Error al fijar el precio manual.', 'error'),
  });
  const clearPrecioMut = useMutation({
    mutationFn: ({ id, ...data }) => updatePrecioVariante(id, { ...data, precio_manual: null }),
    onSuccess: invalidar,
    onError: () => notify('Error al quitar el override.', 'error'),
  });
  const deletePrecioMut = useMutation({
    mutationFn: (id) => deletePrecioVariante(id),
    onSuccess: invalidar,
    onError: () => notify('Error al eliminar el precio.', 'error'),
  });

  const gruposFaltantes = grupos.filter((g) => (variante.componentes?.length || (g.tipo === 'cuero' ? variante.decimetraje_cuero : variante.metraje_tela)) && !variante.precios.some((p) => p.grupo === g.id));

  return (
    <div className={`lp-variante-card${expandido ? ' lp-variante-card--open' : ''}`}>
      <div className="lp-variante-header lp-variante-captura">
        <div className="lp-captura-identidad">
          <CampoPrecio tipo="texto" label="Producto / medida" valor={variante.nombre}
            onCommit={(nombre) => updateVarianteMut.mutateAsync({ nombre })} />
          <div className="lp-captura-insignias">{variante.cargos.some((c) => c.tipo === 'decorativos') && <span className="lp-decorativos-badge" title="Cojines incluidos: 2 decorativos por unidad"><FaCouch size={9} /> Decorativos x2</span>}
            {!!variante.componentes?.length && <span className="lp-juego-badge" title={variante.componentes.map(c => `${c.cantidad} ${c.variante_nombre}`).join(' + ')}><FaLayerGroup size={10} /> Conjunto</span>}
          </div>
        </div>
        {variante.componentes?.length ? <div className="lp-captura lp-captura-costo lp-costo-total-producto"><label htmlFor={`costo-total-${variante.id}`}>Costo total del producto</label><div className="lp-captura-control"><input id={`costo-total-${variante.id}`} className="lp-inline-input" value={formatCOP(variante.costo_total_producto)} readOnly /></div><small>Base sin tela/cuero</small></div>
          : <CampoPrecio label="Costo base" valor={variante.costo_base} className="lp-captura-costo" onCommit={(costo_base) => updateVarianteMut.mutateAsync({ costo_base })} />}
        {variante.componentes?.length ? <p className="lp-consumo-heredado">Consumos según las piezas del conjunto</p> : <div className="lp-consumos" role="group" aria-label={`Materiales de ${variante.nombre}`}>
          <ConsumoMaterial material="tela" valor={variante.metraje_tela} onCommit={(metraje_tela) => updateVarianteMut.mutateAsync({ metraje_tela })} />
          <ConsumoMaterial material="cuero" valor={variante.decimetraje_cuero} onCommit={(decimetraje_cuero) => updateVarianteMut.mutateAsync({ decimetraje_cuero })} />
        </div>}
        <CampoPrecio label="Tope Dcto" tipo="decimal" valor={variante.descuento_maximo} nullable min={0} max={100} sufijo="%" placeholder="25"
          className="lp-captura-descuento" onCommit={(descuento_maximo) => updateVarianteMut.mutateAsync({ descuento_maximo })} />
        <label className="lp-captura-categoria">Categoría
          <select className="lp-inline-input lp-inline-select" value={variante.categoria} aria-label="Categoría del producto" disabled={updateVarianteMut.isPending}
            onChange={(e) => updateVarianteMut.mutate({ categoria: e.target.value })}>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <span
          className={`lp-multiplicador-badge ${variante.multiplicador ? 'lp-multiplicador-badge--custom' : ''}`}
          title={variante.multiplicador ? `Multiplicador propio: ${variante.multiplicador_nombre}` : 'Usa el multiplicador general'}
        >
          ×{Number(variante.multiplicador_efectivo).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
        </span>
        <button className="action-btn" title="Eliminar detalle" onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${variante.nombre}"?`)) deleteVarianteMut.mutate(); }}>
          <FaTrash size={13} />
        </button>
        <button type="button" className="lp-variante-expand" aria-expanded={expandido}
          aria-controls={`variante-detalle-${variante.id}`} aria-label={`${expandido ? 'Contraer' : 'Expandir'} ${variante.nombre}`}
          onClick={(e) => { e.stopPropagation();
            if (expandido && e.currentTarget.closest('.lp-variante-card').querySelector('[data-estado="error"], [data-estado="pendiente"], [data-estado="guardando"]')) {
              notify('Confirma o corrige los campos pendientes antes de cerrar el detalle.', 'warning'); return;
            }
            setExpandido(!expandido); }}>
          {expandido ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {expandido && (() => {
        // Un grupo «no aplica» si su material (tela o cuero) no está configurado y no tiene precio manual.
        const ventaDe = (grupo) => (variante.precios_venta || []).find((f) => (f.grupo ?? null) === (grupo ?? null));
        const aplica = (p) => p.precio_manual != null || p.grupo == null || !variante.precios_venta || !!ventaDe(p.grupo);
        const visibles = variante.precios.filter(aplica);
        const ocultos = variante.precios.filter((p) => !aplica(p));
        const sueltos = (variante.precios_venta || []).filter((f) => !variante.precios.some((p) => (p.grupo ?? null) === (f.grupo ?? null)));
        const fila = (p) => {
          const nombre = p.grupo_nombre || 'Único';
          const venta = ventaDe(p.grupo);
          return (
            <tr key={p.id} className={p.precio_manual != null ? 'is-manual' : ''}>
              <th scope="row">{nombre}{p.precio_manual != null && <span className="lp-override-badge" title="Precio manual: no usa el cálculo"><FaLock size={9} /> Manual</span>}</th>
              <td className="lp-pt-num lp-pt-calc" data-titulo="Calculado">{aplica(p) ? formatCOP(p.precio_calculado) : '—'}</td>
              <td className="lp-pt-manual"><CampoPrecio label={`Precio manual de ${nombre}`} valor={p.precio_manual} placeholder="Automático"
                onCommit={(precio_manual) => updatePrecioMut.mutateAsync({ id: p.id, variante: variante.id, grupo: p.grupo, precio_manual })} /></td>
              <td className="lp-pt-num lp-pt-venta" data-titulo="Venta">{venta ? formatCOP(venta.precio) : '—'}</td>
              <td className="lp-pt-acciones">
                {p.precio_manual != null && (
                  <button type="button" className="action-btn" title="Volver al precio calculado" aria-label={`Volver al calculado en ${nombre}`} onClick={() => clearPrecioMut.mutate({ id: p.id, variante: variante.id, grupo: p.grupo })}>
                    <FaCalculator size={11} />
                  </button>
                )}
                <button type="button" className="action-btn" title="Quitar este grupo" aria-label={`Quitar ${nombre}`} onClick={() => deletePrecioMut.mutate(p.id)}><FaTrash size={11} /></button>
              </td>
            </tr>
          );
        };
        const cabeza = <thead><tr><th scope="col">Grupo</th><th scope="col" className="lp-pt-num">Calculado</th><th scope="col">Precio manual</th><th scope="col" className="lp-pt-num">Venta</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>;
        return (
          <div className="lp-variante-body" id={`variante-detalle-${variante.id}`}>
            <AgrupacionVariante variante={variante} linea={linea} general={multiplicadores.find(m => m.es_general)?.valor} notify={notify} />
            <section className="lp-detalle-precios" aria-label={`Precios por grupo de ${variante.nombre}`}>
              <p className="lp-section-label">Precios por grupo <small>Manual vacío = usa el calculado</small></p>
              {visibles.length > 0 && <table className="lp-precios-tabla">{cabeza}<tbody>{visibles.map(fila)}</tbody></table>}
              {!visibles.length && !ocultos.length && <p className="lp-section-hint">Sin grupos todavía.</p>}
              {ocultos.length > 0 && (
                <details className="lp-precios-ocultos">
                  <summary>{ocultos.length} grupo{ocultos.length === 1 ? '' : 's'} sin material configurado <span>({ocultos.map((p) => p.grupo_nombre).join(', ')})</span></summary>
                  <table className="lp-precios-tabla">{cabeza}<tbody>{ocultos.map(fila)}</tbody></table>
                </details>
              )}
              {sueltos.length > 0 && <p className="lp-section-hint">Venta: {sueltos.map((f) => `${f.grupo_nombre || 'Precio único'} ${formatCOP(f.precio)}`).join(' · ')}</p>}
              {gruposFaltantes.length > 0 && (
                <div className="lp-precio-add">
                  {gruposFaltantes.map((g) => (
                    <Button key={g.id} size="sm" variant="ghost" icon={FaPlus} onClick={() => updatePrecioMut.mutate({ variante: variante.id, grupo: g.id })}>
                      {g.nombre}
                    </Button>
                  ))}
                </div>
              )}
            </section>

            <div className="lp-detalle-lateral">
              <div className="lp-variante-section lp-margen">
                <label className="lp-section-label" htmlFor={`margen-${variante.id}`}><FaPercent size={10} /> Margen</label>
                <select id={`margen-${variante.id}`} className="lp-inline-input lp-inline-select" value={variante.multiplicador ?? ''}
                  onChange={(e) => updateVarianteMut.mutate({ multiplicador: e.target.value || null })}>
                  <option value="">General</option>
                  {multiplicadores.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} (×{fmtMult(m.valor)})</option>
                  ))}
                </select>
                <span className="lp-multiplicador-resultado">×{Number(variante.multiplicador_efectivo).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span>
              </div>

              <div className="lp-variante-section">
                <p className="lp-section-label">Cargos <small>Obligatorio va en el precio · opcional habilitado aparece ya seleccionado al cotizar</small></p>
                <CargosVariante variante={variante} lineaId={linea.id} notify={notify} />
              </div>

              <div className="lp-variante-section">
                <p className="lp-section-label"><FaStickyNote size={10} /> Notas</p>
                <NotasEditor notas={variante.notas} onChange={(nuevas) => updateVarianteMut.mutate({ notas: nuevas })} />
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

function LineaFormModal({ isOpen, onClose, linea, onSave, isLoading, notify, error }) {
  const [form, setForm] = useState({ nombre: '', notas: '', activo: true, fotos: [] });

  useEffect(() => {
    if (linea) {
      setForm({ nombre: linea.nombre, notas: linea.notas || '', activo: linea.activo, fotos: linea.fotos || [] });
    } else {
      setForm({ nombre: '', notas: '', activo: true, fotos: [] });
    }
  }, [linea, isOpen]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={linea ? 'Editar Línea' : 'Nueva Línea de Producto'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="lp-linea-form" loading={isLoading}>{linea ? 'Guardar Cambios' : 'Crear Línea'}</Button>
        </>
      }
    >
      <form id="lp-linea-form" onSubmit={(e) => { e.preventDefault(); onSave({ id: linea?.id, ...form }); }}>
        {error && <div className="ds-error-box" role="alert">{error}</div>}
        <div className="ds-field">
          <label className="ds-label" htmlFor="lp-linea-nombre">Nombre</label>
          <input id="lp-linea-nombre" className="ds-input" value={form.nombre} maxLength={150} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <div className="ds-field">
          <label className="ds-label">Notas</label>
          <textarea className="ds-input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder='Ej: "modificaciones mínimas aumentan 7%"' />
        </div>
        <div className="ds-field lp-checkbox-field">
          <label><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activa (visible para vendedores)</label>
        </div>
        <div className="ds-field">
          <label className="ds-label">Fotos</label>
          <FotosEditor fotos={form.fotos} onChange={(fotos) => setForm({ ...form, fotos })} notify={notify} />
        </div>
      </form>
    </Modal>
  );
}

const LineaRow = memo(function LineaRow({ linea: resumen, grupos, categorias, multiplicadores, onEdit, notify }) {
  const [expandido, setExpandido] = useState(false);
  const [nuevaAgrupacion, setNuevaAgrupacion] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState(categorias[0]?.id || '');
  const queryClient = useQueryClient();
  const detalle = useQuery({
    queryKey: ['lp-linea', resumen.id], queryFn: ({ signal }) => getLinea(resumen.id, { signal }),
    enabled: expandido || nuevaAgrupacion, staleTime: 60_000,
  });
  const linea = detalle.data || resumen;
  useEffect(() => {
    if (!detalle.data) return;
    queryClient.setQueriesData({ queryKey: ['lp-lineas'] }, anterior => Array.isArray(anterior)
      ? anterior.map(l => l.id === detalle.data.id ? detalle.data : l) : anterior);
  }, [detalle.data, queryClient]);

  const createVarianteMut = useMutation({
    mutationFn: (data) => createVariante(data),
    onSuccess: () => invalidarListaPrecios(queryClient, linea.id),
    onError: () => notify('Error al crear el detalle.', 'error'),
  });
  const deleteLineaMut = useMutation({
    mutationFn: () => deleteLinea(linea.id),
    onSuccess: () => {
      invalidarListaPrecios(queryClient);
      notify('Línea eliminada.', 'success');
    },
    onError: () => notify('Error al eliminar la línea.', 'error'),
  });

  const categoriasDeLinea = [...new Set(linea.variantes.map((v) => v.categoria_nombre))];

  return (
    <div className="ds-card lp-linea-card">
      <div className="lp-linea-header" onClick={(e) => {
        if (expandido && e.currentTarget.closest('.lp-linea-card').querySelector('[data-estado="error"], [data-estado="pendiente"], [data-estado="guardando"]')) {
          notify('Confirma o corrige los campos pendientes antes de cerrar la línea.', 'warning'); return;
        }
        setExpandido(!expandido);
      }}>
        <div className="lp-linea-foto">
          {linea.fotos?.[0] ? <img src={linea.fotos[0]} alt="" /> : <FaImage />}
        </div>
        <div className="lp-linea-info">
          <span className="lp-linea-nombre">{linea.nombre}</span>
          <span className="lp-linea-sub">{categoriasDeLinea.join(' · ') || 'Sin detalles'} · {linea.variantes.length} variante(s)</span>
        </div>
        {linea.activo ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}
        <button className="action-btn" title="Editar línea" onClick={(e) => { e.stopPropagation(); onEdit(linea); }}><FaEdit size={14} /></button>
        <button
          className="action-btn"
          title="Eliminar línea"
          onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${linea.nombre}" y todos sus detalles?`)) deleteLineaMut.mutate(); }}
        >
          <FaTrash size={14} />
        </button>
        {expandido ? <FaChevronUp /> : <FaChevronDown />}
      </div>
      {expandido && !detalle.data && <div className="lp-linea-variantes" role="status">{detalle.isError
        ? <ErrorState message="No se pudieron cargar los precios de esta referencia." onRetry={detalle.refetch} /> : 'Cargando precios…'}</div>}
      {expandido && detalle.data && (
        <div className="lp-linea-variantes" aria-busy={detalle.isFetching}>
          {detalle.isFetching && <p className="lp-section-hint" role="status">Actualizando precios…</p>}
          {detalle.isError && <ErrorState message="No se pudieron actualizar los precios. Reintenta para confirmar los cálculos." onRetry={detalle.refetch} />}
          <VariantesOrdenables linea={linea} notify={notify}>{v => (
            <VarianteEditor variante={v} linea={linea} grupos={grupos} categorias={categorias} multiplicadores={multiplicadores} notify={notify} />
          )}</VariantesOrdenables>
          <div className="lp-agregar-variante-row">
            <select
              className="lp-inline-input lp-inline-select"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
            >
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <Button
              size="sm" variant="ghost" icon={FaPlus}
              onClick={() => createVarianteMut.mutate({ linea: linea.id, categoria: nuevaCategoria, nombre: 'Nuevo detalle', costo_base: 0 })}
            >
              Agregar variante
            </Button>
            <Button size="sm" variant="ghost" icon={FaLayerGroup} disabled={!linea.variantes.some(v => !v.componentes?.length)} onClick={() => setNuevaAgrupacion(true)}>
              Agregar agrupación
            </Button>
          </div>
          <EspecialesLinea linea={linea} grupos={grupos} multiplicadores={multiplicadores} notify={notify} />
        </div>
      )}
      {nuevaAgrupacion && <Modal open title="Nueva agrupación de productos" size="lg" className="lp-admin-page lp-agrupacion-modal" onClose={() => setNuevaAgrupacion(false)}>
        <AgrupacionVariante nuevo linea={linea} variante={{ componentes: [] }} general={multiplicadores.find(m => m.es_general)?.valor} categorias={categorias} notify={notify} onCancelar={() => setNuevaAgrupacion(false)} onCreado={() => setNuevaAgrupacion(false)} />
      </Modal>}
    </div>
  );
});

function LineasTab({ notify }) {
  const queryClient = useQueryClient();
  const [categoriaId, setCategoriaId] = useState('');
  const [search, setSearch] = useState('');
  const busqueda = useDebounce(search, 350);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: categorias = [] } = useQuery({ queryKey: ['lp-categorias'], queryFn: getCategorias });
  const { data: grupos = [] } = useQuery({ queryKey: ['lp-grupos'], queryFn: getGruposTela });
  const { data: multiplicadores = [] } = useQuery({ queryKey: ['lp-multiplicadores'], queryFn: getMultiplicadores });
  const { data: lineas = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['lp-lineas', 'resumen', categoriaId, busqueda],
    queryFn: () => getLineas({
      resumen: 1,
      ...(categoriaId ? { categoria: categoriaId } : {}),
      ...(busqueda ? { search: busqueda } : {}),
    }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...data }) => (id ? updateLinea(id, data) : createLinea(data)),
    onSuccess: () => {
      invalidarListaPrecios(queryClient);
      setModalOpen(false);
      notify(`Línea ${editing ? 'actualizada' : 'creada'} exitosamente.`, 'success');
    },
    onError: (err) => notify(mensajeDeError(err, 'Error al guardar la línea.'), 'error'),
  });
  const { reset: resetGuardarLinea } = saveMutation;
  const editarLinea = useCallback(l => { resetGuardarLinea(); setEditing(l); setModalOpen(true); }, [resetGuardarLinea]);

  return (
    <div>
      <div className="lp-tab-toolbar">
        <div className="v-search-pill lp-lineas-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar línea o detalle (ej. Detroit, Sofá 3p.)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="lp-search-clear" onClick={() => setSearch('')}><FaTimes /></button>
          )}
        </div>
        <div className="v-select-pill">
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: '0 0.5rem', fontWeight: 600 }}>Categoría:</span>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <Button icon={FaPlus} onClick={() => { saveMutation.reset(); setEditing(null); setModalOpen(true); }}>Nueva Línea</Button>
      </div>

      {isLoading ? (
        <div className="lp-loading">Cargando líneas...</div>
      ) : isError ? (
        <ErrorState message="No se pudieron cargar las líneas." onRetry={refetch} />
      ) : lineas.length === 0 ? (
        <EmptyState
          title="Sin líneas"
          message={busqueda ? `Sin resultados para "${busqueda}".` : 'Crea la primera línea de esta categoría.'}
        />
      ) : (
        <div className="lp-lineas-list">
          {lineas.map((linea) => (
            <LineaRow key={linea.id} linea={linea} grupos={grupos} categorias={categorias} multiplicadores={multiplicadores} onEdit={editarLinea} notify={notify} />
          ))}
        </div>
      )}

      <LineaFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        linea={editing}
        isLoading={saveMutation.isPending}
        onSave={(data) => saveMutation.mutate(data)}
        notify={notify}
        error={saveMutation.isError ? mensajeDeError(saveMutation.error, 'Error al guardar la línea.') : ''}
      />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

function ListaPreciosAdminPage() {
  const [activeTab, setActiveTab] = useState(pestanaGuardada);
  const cambiarPestana = (id) => {
    setActiveTab(id);
    try { sessionStorage.setItem(CLAVE_PESTANA, id); } catch { /* sin almacenamiento: solo no se recuerda */ }
  };
  const [notification, setNotification] = useState({ message: '', type: '' });
  const notify = useCallback((message, type = 'success') => setNotification({ message, type }), []);

  return (
    <div className="ds-page lp-admin-page ds-fade-in">
      <AppNotification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
      <PageHeader icon={FaTags} title="Administrar Lista de Precios" subtitle="Productos, grupos de tela, márgenes y categorías" />
      <PestanasAdmin activa={activeTab} onCambiar={cambiarPestana} />
      <div key={activeTab} id="lp-admin-panel" role="tabpanel" aria-labelledby={`lp-tab-${activeTab}`} className="lp-admin-panel">
        {activeTab === 'categorias' && <CategoriasTab notify={notify} />}
        {activeTab === 'multiplicadores' && <MultiplicadoresTab notify={notify} />}
        {activeTab === 'matriz' && <MatrizTab notify={notify} />}
        {activeTab === 'lineas' && <LineasTab notify={notify} />}
      </div>
    </div>
  );
}

export default ListaPreciosAdminPage;
