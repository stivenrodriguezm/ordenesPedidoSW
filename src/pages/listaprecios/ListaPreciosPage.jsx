import React, { useContext, useDeferredValue, useMemo, useState, useSyncExternalStore, useLayoutEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FaTags, FaSearch, FaTimes, FaShoppingCart, FaSyncAlt, FaLayerGroup, FaClock, FaArrowRight, FaThLarge, FaList } from 'react-icons/fa';
import { getCatalogo, getCategoriasPublicas, getPrecioVariante, createCotizacion } from '../../services/listaPreciosService';
import { AppContext } from '../../AppContext';
import { PageHeader, Button } from '../../components/ui';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { formatCOP } from '../../utils/formatCOP';
import { buscarCatalogo, indexarCatalogo, notasCotizacion, precioValido } from '../../utils/consultaPrecios';
import { mensajeDeError } from '../../services/errores';
import useCotizacionCart from '../../hooks/useCotizacionCart';
import CotizacionPrintModal from '../../components/CotizacionPrintModal';
import FotoPrecio from './FotoPrecio';
import ConfiguradorPrecio from './ConfiguradorPrecio';
import CotizacionConsulta from './CotizacionConsulta';
import './ListaPreciosPage.css';

// Última consulta del catálogo en este navegador: la página se ve al instante y el servidor
// confirma los precios por detrás (sin confirmar, no se agrega nada a la cotización).
const claveCatalogo = (usuarioId) => `lp_catalogo_${usuarioId ?? 'anon'}`;
const leerCatalogo = (usuarioId) => {
  try { const g = JSON.parse(localStorage.getItem(claveCatalogo(usuarioId)) || 'null'); return Array.isArray(g?.data) ? g : null; } catch { return null; }
};
const guardarCatalogo = (usuarioId, data) => {
  try { localStorage.setItem(claveCatalogo(usuarioId), JSON.stringify({ t: Date.now(), data })); } catch { /* sin espacio: solo no se recuerda */ }
};
const pantallaConMouse = () => { try { return window.matchMedia('(pointer: fine)').matches; } catch { return false; } };

const mediaEscritorio = '(min-width: 1200px)';
const suscribirPantalla = (avisar) => {
  const media = window.matchMedia?.(mediaEscritorio);
  media?.addEventListener('change', avisar);
  return () => media?.removeEventListener('change', avisar);
};
const leerEscritorio = () => window.matchMedia?.(mediaEscritorio)?.matches ?? false;
const minimo = (l) => {
  const precios = l.variantes.flatMap(v => v.precios || []).map(p => p.precio).filter(precioValido).map(Number);
  return precios.length ? Math.min(...precios) : Infinity;
};

function ListaPreciosPage() {
  const { usuario } = useContext(AppContext);
  const escritorio = useSyncExternalStore(suscribirPantalla, leerEscritorio, () => false);
  const panelRef = useRef(null);
  useLayoutEffect(() => {
    if (!escritorio || !panelRef.current) return undefined;
    const ajustar = () => {
      const panel = panelRef.current;
      if (panel) panel.style.setProperty('--lp-panel-altura', `${Math.max(300, window.innerHeight - Math.max(24, panel.getBoundingClientRect().top) - 24)}px`);
    };
    ajustar();
    window.addEventListener('scroll', ajustar, true);
    window.addEventListener('resize', ajustar);
    return () => { window.removeEventListener('scroll', ajustar, true); window.removeEventListener('resize', ajustar); };
  }, [escritorio]);
  const [vista, setVista] = useState('tarjetas');
  const [orden, setOrden] = useState('nombre');
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [soloConjuntos, setSoloConjuntos] = useState(false);
  const [seleccion, setSeleccion] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [aviso, setAviso] = useState('');
  const cart = useCotizacionCart(usuario?.id);
  const categorias = useQuery({ queryKey: ['listaprecios-categorias-publicas'], queryFn: getCategoriasPublicas, staleTime: 60000 });
  // Un catálogo compartido en caché: buscar y cambiar categoría es inmediato.
  const [guardado] = useState(() => leerCatalogo(usuario?.id));
  const catalogo = useQuery({
    queryKey: ['listaprecios-catalogo', usuario?.id],
    queryFn: async () => { const data = await getCatalogo(); guardarCatalogo(usuario?.id, data); return data; },
    staleTime: 30000,
    initialData: guardado?.data,
    initialDataUpdatedAt: guardado?.t,
  });
  // Precios confirmados por el servidor en esta visita (no solo los guardados en el navegador).
  const confirmando = catalogo.isFetching && !catalogo.isFetchedAfterMount;
  const lineas = useMemo(() => catalogo.data || [], [catalogo.data]);
  const indice = useMemo(() => indexarCatalogo(lineas), [lineas]);
  // La lista se filtra sin bloquear lo que se escribe.
  const busqueda = useDeferredValue(search);
  const resultados = useMemo(() => {
    const filtradas = buscarCatalogo(indice, categoria, busqueda);
    const visibles = soloConjuntos ? filtradas.map((l) => ({ ...l, variantes: l.variantes.filter((v) => v.componentes) })).filter((l) => l.variantes.length) : filtradas;
    return [...visibles].sort((a, b) => orden === 'precio' ? minimo(a) - minimo(b) || a.nombre.localeCompare(b.nombre, 'es') : a.nombre.localeCompare(b.nombre, 'es'));
  }, [indice, categoria, busqueda, soloConjuntos, orden]);

  const abrirLinea = (linea, inicial) => {
    setAviso('');
    const completa = lineas.find((l) => l.id === linea.id);
    if (!completa) { setAviso('La referencia ya no está disponible. Actualiza el catálogo.'); return; }
    const preferida = linea.variantes[0];
    setSeleccion({ linea: completa, inicial: inicial || { varianteId: preferida?.id, grupoId: preferida?.precios?.[0]?.grupo ?? null } });
    setRecientes((ids) => [linea.id, ...ids.filter((id) => id !== linea.id)].slice(0, 5));
  };
  const editarItem = (item) => {
    const linea = lineas.find((l) => l.id === item.lineaId);
    if (!linea || !linea.variantes.some((v) => v.id === item.varianteId)) { setAviso('Este producto ya no está en el catálogo. Quita la opción y consulta una referencia vigente.'); return; }
    setCartOpen(false);
    abrirLinea(linea, item);
  };
  const generar = useMutation({
    mutationFn: async ({ cliente, descuento }) => {
      // Verificar también los precios recuperados del carrito de una visita anterior.
      const vigentes = await Promise.all(cart.items.map((item) => getPrecioVariante(item.varianteId, {
        grupo: item.grupoId, opcionales: (item.opcionales || []).map((o) => o.id),
      })));
      let cambiaron = false;
      vigentes.forEach((vigente, i) => {
        if (!precioValido(vigente.precio)) throw new Error('Un producto no tiene un precio vigente. Revisa sus opciones.');
        if (Math.abs(Number(vigente.precio) - Number(cart.items[i].precioUnitario)) > 0.01) {
          cart.actualizarItem(cart.items[i].id, { precioUnitario: Number(vigente.precio), opcionales: vigente.opcionales_incluidos || [] });
          cambiaron = true;
        }
      });
      if (cambiaron) throw new Error('Los precios cambiaron desde la consulta y ya se actualizaron. Revisa el nuevo total antes de generar la cotización.');
      const items = cart.items.map((item) => ({ ...item, notas: notasCotizacion(item), incluido: cart.incluidos[item.id]?.valor || 0 }));
      const res = await createCotizacion({ cliente_nombre: cliente, descuento, lineas: items.map((item) => ({
        variante: item.varianteId, linea_nombre: item.lineaNombre, variante_nombre: item.varianteNombre,
        categoria_nombre: item.categoriaNombre, grupo_nombre: item.grupoNombre, grupo_tela: item.grupoId,
        cantidad: item.cantidad, precio_unitario: item.precioUnitario, opcionales: item.opcionales || [],
        notas: item.notas, foto: item.foto || null,
      })) });
      return { items, cliente, descuento, folio: res.numero };
    },
    onSuccess: (data) => { setPrintData(data); setCartOpen(false); },
  });

  const configurador = seleccion ? <ConfiguradorPrecio key={`${seleccion.linea.id}-${seleccion.inicial?.id || 'consulta'}-${seleccion.inicial?.varianteId}-${seleccion.inicial?.grupoId}`} inline={escritorio} linea={lineas.find((l) => l.id === seleccion.linea.id) || seleccion.linea} inicial={seleccion.inicial} confirmando={confirmando} onClose={() => setSeleccion(null)}
      onAgregar={(item) => seleccion.inicial?.id ? cart.actualizarItem(seleccion.inicial.id, item) : cart.agregarItem(item)} onVerCotizacion={() => { setSeleccion(null); setCartOpen(true); }} /> : null;

  return <div className={`ds-page lp-page ${escritorio ? 'lp-page--escritorio' : ''}`}>
    <PageHeader icon={FaTags} title="Lista de precios" subtitle="Encuentra el mueble. Cambia la tela. Acompaña la venta." />
    {escritorio && <div className="lp-escritorio-intro"><span>SHOWROOM / CATÁLOGO</span><p>Una referencia. Todas sus posibilidades.</p></div>}
    <div className="lp-workspace"><div className="lp-catalogo-panel">
    <div className="lp-consulta-toolbar">
      <div className="lp-search"><FaSearch aria-hidden="true" /><input type="search" aria-label="Buscar referencia o medida" placeholder="Referencia, sofá, medida, comedor…" value={search} onChange={(e) => setSearch(e.target.value)}
        autoFocus={pantallaConMouse()} enterKeyHint="search" onKeyDown={(e) => { if (e.key === 'Enter' && resultados.length) { e.preventDefault(); abrirLinea(resultados[0]); } }} />
        {search && <button className="lp-icon-btn" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}><FaTimes /></button>}</div>
      <button className="lp-icon-btn" aria-label="Actualizar precios" disabled={catalogo.isFetching} onClick={() => catalogo.refetch()}><FaSyncAlt className={catalogo.isFetching ? 'lp-girando' : ''} /></button>
    </div>
    <div className="lp-categoria-chips" role="group" aria-label="Categoría">
      <button className={`lp-chip ${!categoria ? 'lp-chip--active' : ''}`} aria-pressed={!categoria} onClick={() => setCategoria('')}>Todas</button>
      {(categorias.data || []).map((cat) => <button key={cat.id} className={`lp-chip ${String(categoria) === String(cat.id) ? 'lp-chip--active' : ''}`} aria-pressed={String(categoria) === String(cat.id)} onClick={() => setCategoria(cat.id)}>{cat.nombre}</button>)}
    </div>
    {categorias.isError && <p className="lp-ayuda">No se pudieron cargar las categorías. Puedes buscar en todo el catálogo. <button onClick={() => categorias.refetch()}>Reintentar</button></p>}
    {!!recientes.length && !search && !categoria && !soloConjuntos && <div className="lp-recientes"><span><FaClock /> Recientes</span>{recientes.map((id) => lineas.find((l) => l.id === id)).filter(Boolean).map((l) => <button key={l.id} onClick={() => abrirLinea(l)}>{l.nombre}</button>)}</div>}
    <div className="lp-resultados-cabeza"><span aria-live="polite">{catalogo.isLoading ? 'Cargando catálogo…' : `${resultados.length} referencias`}</span>
      {escritorio && <div className="lp-catalogo-controles"><label>Ordenar <select aria-label="Ordenar referencias" value={orden} onChange={e => setOrden(e.target.value)}><option value="nombre">Nombre A–Z</option><option value="precio">Menor precio</option></select></label>
        <div role="group" aria-label="Vista del catálogo"><button aria-label="Ver tarjetas" aria-pressed={vista === 'tarjetas'} onClick={() => setVista('tarjetas')}><FaThLarge /></button><button aria-label="Ver lista" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}><FaList /></button></div></div>}
      <button className={`lp-conjuntos-filtro ${soloConjuntos ? 'is-selected' : ''}`} aria-pressed={soloConjuntos} onClick={() => setSoloConjuntos((v) => !v)}><FaLayerGroup /> Conjuntos</button></div>
    {catalogo.isFetching && !catalogo.isLoading && <p className="lp-ayuda" role="status">{confirmando ? 'Confirmando precios vigentes…' : 'Actualizando precios…'}</p>}
    {aviso && <p className="lp-aviso" role="alert">{aviso}</p>}
    {catalogo.isError && lineas.length > 0 && <p className="lp-aviso" role="alert">No se pudo actualizar. Los precios visibles corresponden a la última consulta. <button onClick={() => catalogo.refetch()}>Reintentar</button></p>}
    {catalogo.isLoading ? <div className="lp-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="lp-card lp-card--skeleton" />)}</div>
      : catalogo.isError && !lineas.length ? <ErrorState message="No se pudo cargar el catálogo de precios." onRetry={catalogo.refetch} />
      : !resultados.length ? <EmptyState icon={FaSearch} title="Sin coincidencias" message="Prueba con la referencia, el tipo de mueble o su medida." action={<Button onClick={() => { setSearch(''); setCategoria(''); setSoloConjuntos(false); }}>Ver todo</Button>} />
      : <div className={`lp-grid ${escritorio && vista === 'lista' ? 'lp-grid--lista' : ''}`}>{resultados.map((linea) => {
        const precios = linea.variantes.flatMap((v) => v.precios || []).map((p) => p.precio).filter(precioValido).map(Number);
        const conjunto = linea.variantes.some((v) => v.componentes);
        return <button key={linea.id} className={`lp-card ${seleccion?.linea.id === linea.id ? 'lp-card--seleccionada' : ''}`} aria-pressed={seleccion?.linea.id === linea.id} onClick={() => abrirLinea(linea)} aria-label={`Consultar ${linea.nombre}${linea.proveedor_nombre ? ` de ${linea.proveedor_nombre} · Ref. ${linea.referencia}` : ''}`}>
          <div className="lp-card-foto"><FotoPrecio src={linea.fotos?.[0]} loading="lazy" decoding="async" /></div>
          <div className="lp-card-info"><span className="lp-eyebrow">{[...new Set(linea.variantes.map((v) => v.categoria_nombre))].filter(Boolean).join(' · ')}</span><strong className="lp-card-nombre">{linea.nombre}</strong>
            {linea.proveedor_nombre && <small className="lp-card-proveedor">{linea.proveedor_nombre} · Ref. #{linea.referencia}</small>}
            <span className="lp-card-descripcion">{linea.variantes.length === 1 ? linea.variantes[0].nombre : `${linea.variantes.length} productos y medidas`}</span>
            <span className="lp-card-precio">{precios.length ? `Desde ${formatCOP(Math.min(...precios))}` : 'Consultar disponibilidad de precio'}</span>
            {escritorio && <span className="lp-card-abrir">Ver opciones <FaArrowRight /></span>}
            {conjunto && <span className="lp-card-conjunto"><FaLayerGroup /> Conjunto disponible</span>}</div>
        </button>;
      })}</div>}
    <p className="lp-catalogo-nota">Elige una referencia para ver el precio exacto según producto, medida y grupo de tela.</p>
    </div>
    {escritorio && <aside ref={panelRef} className="lp-venta-panel" aria-label="Asistente de venta">
      {configurador || <section className="lp-venta-bienvenida"><div className="lp-venta-simbolo"><FaTags /></div><span className="lp-eyebrow">Tu consulta, en un solo lugar</span><h2>Encuentra la combinación ideal.</h2><p>Selecciona una referencia. Aquí podrás cambiar la medida, explorar telas y confirmar el precio sin perder de vista el catálogo.</p><ol><li>Elige producto y medida</li><li>Elige tela y opciones</li><li>Agrégalo a la cotización</li></ol></section>}
      <section className="lp-venta-resumen" aria-label="Resumen de la venta"><div className="lp-venta-resumen-titulo"><span className="lp-eyebrow">La propuesta del cliente</span><span>{cart.items.length} productos</span></div>
        {cart.items.length > 0 && <ul>{cart.items.slice(-3).map(item => <li key={item.id}><span><strong>{item.lineaNombre}</strong><small>{item.varianteNombre} · {item.grupoNombre || 'Sin tela'} · ×{item.cantidad}</small></span><b>{formatCOP(item.precioUnitario * item.cantidad)}</b></li>)}</ul>}
        <div className="lp-venta-total"><span>Total cotización</span><strong>{formatCOP(cart.total)}</strong></div>
        <button className="lp-venta-abrir" onClick={() => setCartOpen(true)}>Revisar cotización <FaArrowRight /></button>
      </section>
    </aside>}
    </div>
    {!escritorio && configurador}
    {!escritorio && <div className="lp-consulta-dock">
      <button className="lp-dock-cotizacion" onClick={() => setCartOpen(true)}><FaShoppingCart /><span>Cotización <strong>{cart.items.length} productos · {formatCOP(cart.total)}</strong></span></button>
    </div>}

    <CotizacionConsulta open={cartOpen} cart={cart} onClose={() => setCartOpen(false)} onEditar={editarItem} guardando={generar.isPending}
      error={generar.isError ? (generar.error?.isAxiosError || generar.error?.response ? mensajeDeError(generar.error, 'No se pudo guardar la cotización. Tus productos siguen aquí.') : generar.error.message) : ''}
      onGenerar={(cliente, descuento) => generar.mutate({ cliente, descuento })} />
    <CotizacionPrintModal open={!!printData} onClose={() => setPrintData(null)} items={printData?.items} cliente={printData?.cliente} descuento={printData?.descuento || 0}
      vendedorNombre={usuario?.first_name ? `${usuario.first_name} ${usuario.last_name || ''}`.trim() : usuario?.username} folio={printData?.folio} />
  </div>;
}

export default ListaPreciosPage;
