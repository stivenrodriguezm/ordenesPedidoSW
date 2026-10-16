import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useBorrador } from './useBorrador'

const KEY = 'borrador:prueba:u1'

function Formulario({ dueno = 'u1', restaurar, apiRef }) {
  const [valor, setValor] = useState('')
  const api = useBorrador({
    clave: 'prueba',
    dueno,
    version: 2,
    datos: { valor },
    hayContenido: Boolean(valor),
    restaurar: restaurar || ((d) => setValor(d.valor)),
  })
  if (apiRef) apiRef.current = api
  return (
    <>
      <input aria-label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
      {api.restaurado && <output>Borrador recuperado</output>}
      <button onClick={api.descartar}>Descartar</button>
    </>
  )
}

const escribir = (texto) => fireEvent.change(screen.getByLabelText('Valor'), { target: { value: texto } })
const avanzar = (ms) => act(() => vi.advanceTimersByTime(ms))

afterEach(() => vi.useRealTimers())

describe('useBorrador', () => {
  it('guarda con debounce y restaura al volver a montar', () => {
    vi.useFakeTimers()
    const { unmount } = render(<Formulario />)
    escribir('cliente 1020')
    avanzar(500)
    const guardado = JSON.parse(localStorage.getItem(KEY))
    expect(guardado).toMatchObject({ version: 2, dueno: 'u1', datos: { valor: 'cliente 1020' } })
    expect(guardado.guardadoAt).toBeGreaterThan(0)
    unmount()

    render(<Formulario />)
    expect(screen.getByLabelText('Valor')).toHaveValue('cliente 1020')
    expect(screen.getByText('Borrador recuperado')).toBeInTheDocument()
  })

  it('no guarda mientras el formulario está vacío', () => {
    vi.useFakeTimers()
    render(<Formulario />)
    avanzar(1000)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('descarta borradores de otra versión o expirados; los de otro dueño no se tocan', () => {
    const restaurar = vi.fn()
    const base = { version: 2, dueno: 'u1', guardadoAt: Date.now(), datos: { valor: 'x' } }
    for (const [nombre, borrador, clave, seLimpia] of [
      ['versión vieja', { ...base, version: 1 }, KEY, true],
      ['otro dueño', { ...base, dueno: 'u2' }, 'borrador:prueba:u2', false],
      ['expirado', { ...base, guardadoAt: Date.now() - 8 * 24 * 3600 * 1000 }, KEY, true],
    ]) {
      localStorage.clear()
      localStorage.setItem(clave, JSON.stringify(borrador))
      const { unmount } = render(<Formulario restaurar={restaurar} />)
      expect(restaurar, nombre).not.toHaveBeenCalled()
      expect(Boolean(localStorage.getItem(clave)), nombre).toBe(!seLimpia)
      unmount()
    }
  })

  it('no lee ni escribe hasta conocer al dueño', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, dueno: 'u1', guardadoAt: Date.now(), datos: { valor: 'x' } }))
    const restaurar = vi.fn()
    const { rerender } = render(<Formulario dueno={null} restaurar={restaurar} />)
    expect(restaurar).not.toHaveBeenCalled()
    rerender(<Formulario dueno="u1" restaurar={restaurar} />)
    expect(restaurar).toHaveBeenCalledWith({ valor: 'x' })
  })

  it('descartar borra el borrador pero el formulario sigue autoguardando', () => {
    vi.useFakeTimers()
    localStorage.setItem(KEY, JSON.stringify({ version: 2, dueno: 'u1', guardadoAt: Date.now(), datos: { valor: 'x' } }))
    render(<Formulario />)
    fireEvent.click(screen.getByText('Descartar'))
    expect(localStorage.getItem(KEY)).toBeNull()
    escribir('xnuevo')
    avanzar(500)
    expect(JSON.parse(localStorage.getItem(KEY)).datos.valor).toBe('xnuevo')
  })

  it('limpiarTrasGuardar borra y no reescribe lo enviado; al cambiar los datos sigue guardando', () => {
    vi.useFakeTimers()
    const apiRef = { current: null }
    render(<Formulario apiRef={apiRef} />)
    escribir('venta 2424')
    avanzar(500)
    expect(localStorage.getItem(KEY)).not.toBeNull()
    act(() => apiRef.current.limpiarTrasGuardar())
    expect(localStorage.getItem(KEY)).toBeNull()
    // El mismo contenido (p. ej. el efecto se dispara de nuevo) no se reescribe.
    avanzar(500)
    expect(localStorage.getItem(KEY)).toBeNull()
    // Contenido nuevo (otra venta) vuelve a autoguardarse.
    escribir('venta 2425')
    avanzar(500)
    expect(JSON.parse(localStorage.getItem(KEY)).datos.valor).toBe('venta 2425')
  })

  it('no reintenta la restauración entre renders', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, dueno: 'u1', guardadoAt: Date.now(), datos: { valor: 'x' } }))
    const restaurar = vi.fn()
    const { rerender } = render(<Formulario restaurar={restaurar} />)
    rerender(<Formulario restaurar={restaurar} />)
    expect(restaurar).toHaveBeenCalledTimes(1)
  })
})
