import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useCotizacionCart, { obtenerStorageKey } from './useCotizacionCart'

describe('useCotizacionCart (P09-02)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('usa clave aislada por usuario y limpia la clave legada compartida', () => {
    // Si existía un carrito antiguo no atribuible a nadie
    localStorage.setItem('lp_cotizacion_cart', JSON.stringify([{ id: 'old-1', cantidad: 1 }]))

    const { result } = renderHook(() => useCotizacionCart(15))

    // La clave legada compartida se eliminó para evitar atribuirla al siguiente usuario
    expect(localStorage.getItem('lp_cotizacion_cart')).toBeNull()
    // El usuario 15 empieza con carrito vacío
    expect(result.current.items).toEqual([])

    // Agregar un ítem guarda bajo la clave del usuario 15
    act(() => {
      result.current.agregarItem({
        lineaNombre: 'Sofá Milán',
        varianteNombre: '2 Puestos',
        precioUnitario: 950000,
        cantidad: 1,
      })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.total).toBe(950000)

    const guardado = JSON.parse(localStorage.getItem(obtenerStorageKey(15)))
    expect(guardado).toHaveLength(1)
    expect(guardado[0].lineaNombre).toBe('Sofá Milán')
  })

  it('no comparte el carrito entre dos usuarios distintos', () => {
    // Usuario 10 guarda un carrito
    localStorage.setItem(
      obtenerStorageKey(10),
      JSON.stringify([{ id: 'u10-1', lineaNombre: 'Poltrona', precioUnitario: 400000, cantidad: 2 }])
    )

    // Entra Usuario 20
    const { result, rerender } = renderHook(({ uid }) => useCotizacionCart(uid), {
      initialProps: { uid: 20 },
    })

    expect(result.current.items).toEqual([])

    // Si cambia de usuario a 10, recupera el del usuario 10
    rerender({ uid: 10 })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].lineaNombre).toBe('Poltrona')
    expect(result.current.total).toBe(800000)
  })

  it('vaciar() limpia el estado y remueve el almacenamiento de ese usuario', () => {
    const { result } = renderHook(() => useCotizacionCart(5))

    act(() => {
      result.current.agregarItem({ id: 'item-1', precioUnitario: 100000, cantidad: 1 })
    })
    expect(result.current.items).toHaveLength(1)

    act(() => {
      result.current.vaciar()
    })

    expect(result.current.items).toEqual([])
    expect(result.current.total).toBe(0)
    expect(localStorage.getItem(obtenerStorageKey(5))).toBeNull()
  })
})

describe('Conjuntos comerciales', () => {
  it('agrupa referencias distintas, permite editar una pieza y conserva precio y cantidades al separar', () => {
    const { result } = renderHook(() => useCotizacionCart(8));
    act(() => result.current.agregarItems([
      { lineaNombre: 'Qatar', varianteId: 1, precioUnitario: 1000000, cantidad: 1 },
      { lineaNombre: 'Palermo', varianteId: 2, grupoId: 3, precioUnitario: 200000, cantidad: 6 },
    ]));
    const ids = result.current.items.map(i => i.id);
    act(() => result.current.agrupar(ids, 'Comedor del cliente'));
    expect(result.current.total).toBe(2200000);
    const conjuntoId = result.current.items[0].conjuntoId;
    expect(result.current.items.every(i => i.conjuntoId === conjuntoId)).toBe(true);
    act(() => result.current.actualizarItem(ids[1], { grupoId: 4, precioUnitario: 250000 }));
    expect(result.current.total).toBe(2500000);
    expect(result.current.items[1].conjuntoNombre).toBe('Comedor del cliente');
    expect(JSON.parse(localStorage.getItem(obtenerStorageKey(8)))[1].grupoId).toBe(4);
    act(() => result.current.desagrupar(conjuntoId));
    expect(result.current.items.every(i => !i.conjuntoId)).toBe(true);
    expect(result.current.items[1].cantidad).toBe(6);
    expect(result.current.total).toBe(2500000);
  });
});
