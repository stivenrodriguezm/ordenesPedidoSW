import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { decorativosIncluidos, transportesCompartidos } from '../utils/consultaPrecios';

const LEGACY_STORAGE_KEY = 'lp_cotizacion_cart';
export const obtenerStorageKey = (usuarioId) => `lp_cotizacion_cart_${usuarioId ?? 'anon'}`;

function leerCarritoGuardado(storageKey) {
  try {
    // Si existe clave legada compartida sin dueño, se elimina para no atribuirla
    // silenciosamente al siguiente usuario (P09-02).
    if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Carrito de cotización de Lista de Precios asociado al usuario (P09-02).
 * Evita la clave compartida global para no mezclar carritos entre usuarios
 * que compartan el mismo equipo o navegador.
 */
function useCotizacionCart(usuarioId) {
  const storageKey = obtenerStorageKey(usuarioId);
  const [items, setItems] = useState(() => leerCarritoGuardado(storageKey));
  const usuarioPrevioRef = useRef(usuarioId);

  // Al cambiar de usuario, recargar el carrito correspondiente a ese usuario
  // (limpia caché/estado en memoria del usuario anterior).
  useEffect(() => {
    if (usuarioPrevioRef.current !== usuarioId) {
      usuarioPrevioRef.current = usuarioId;
      setItems(leerCarritoGuardado(obtenerStorageKey(usuarioId)));
    }
  }, [usuarioId]);

  useEffect(() => {
    try {
      if (items.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(items));
      }
    } catch {
      /* best-effort */
    }
  }, [items, storageKey]);

  const agregarItem = useCallback((item) => {
    setItems((prev) => [
      ...prev,
      { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, cantidad: Math.max(1, item.cantidad || 1) },
    ]);
  }, []);

  const agregarItems = useCallback((nuevos) => {
    setItems((prev) => [
      ...prev,
      ...nuevos.map((item, i) => ({
        ...item,
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        cantidad: Math.max(1, item.cantidad || 1),
      })),
    ]);
  }, []);

  const quitarItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const actualizarCantidad = useCallback((id, cantidad) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, cantidad) } : i)));
  }, []);

  const actualizarItem = useCallback((id, cambios) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...cambios, id } : item));
  }, []);

  const agrupar = useCallback((ids, nombre) => {
    if (ids.length < 2 || !nombre.trim()) return;
    const conjuntoId = `conjunto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => prev.map((item) => ids.includes(item.id) ? { ...item, conjuntoId, conjuntoNombre: nombre.trim() } : item));
  }, []);

  const desagrupar = useCallback((conjuntoId) => {
    setItems((prev) => prev.map((item) => item.conjuntoId === conjuntoId ? { ...item, conjuntoId: null, conjuntoNombre: '' } : item));
  }, []);

  const vaciar = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* best-effort */
    }
  }, [storageKey]);

  const bruto = items.reduce((sum, i) => sum + (Number(i.precioUnitario) || 0) * i.cantidad, 0);
  // Decorativos que cubren los «Cojines incluidos» de otros productos de la cotización.
  const incluidos = useMemo(() => decorativosIncluidos(items), [items]);
  const incluido = Object.values(incluidos).reduce((s, r) => s + r.valor, 0);
  // Transporte por envío: lo que no se cobra porque viaja junto (conjunto o cupo de unidades).
  const transportes = useMemo(() => transportesCompartidos(items), [items]);
  const transporteCompartido = Object.values(transportes).reduce((s, r) => s + r.valor, 0);
  const total = bruto - incluido - transporteCompartido;
  // Lo que no se cobra de un ítem (decorativos incluidos y transporte compartido).
  const descontado = useCallback((id) => (incluidos[id]?.valor || 0) + (transportes[id]?.valor || 0), [incluidos, transportes]);

  return { items, agregarItem, agregarItems, quitarItem, actualizarCantidad, actualizarItem, agrupar, desagrupar, vaciar, total, bruto, incluido, incluidos, transportes, transporteCompartido, descontado };
}

export default useCotizacionCart;
