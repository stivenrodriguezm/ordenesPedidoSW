import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import AppNotification from './AppNotification'

// Mismos plazos que el componente: errores 8 s, resto 4 s.
const DURACION_MS = { error: 8000, otro: 4000 }

afterEach(() => vi.useRealTimers())

describe('AppNotification', () => {
  it('anuncia los errores como alerta y les da más tiempo', () => {
    vi.useFakeTimers()
    const cerrar = vi.fn()
    render(<AppNotification message="Saldo insuficiente en caja." type="error" onClose={cerrar} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Saldo insuficiente en caja.')
    act(() => vi.advanceTimersByTime(DURACION_MS.otro))
    expect(cerrar).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(DURACION_MS.error - DURACION_MS.otro))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('los éxitos son status y el cierre tiene nombre', () => {
    render(<AppNotification message="Guardado." type="success" onClose={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Guardado.')
    expect(screen.getByRole('button', { name: 'Cerrar aviso' })).toBeInTheDocument()
  })

  it('no se cierra mientras el puntero está encima', () => {
    vi.useFakeTimers()
    const cerrar = vi.fn()
    render(<AppNotification message="Guardado." type="success" onClose={cerrar} />)
    fireEvent.mouseEnter(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(DURACION_MS.otro * 3))
    expect(cerrar).not.toHaveBeenCalled()
    fireEvent.mouseLeave(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(DURACION_MS.otro))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('un re-render del padre con otro onClose no reinicia el plazo', () => {
    vi.useFakeTimers()
    const cerrar = vi.fn()
    const { rerender } = render(<AppNotification message="Guardado." type="success" onClose={() => cerrar()} />)
    act(() => vi.advanceTimersByTime(DURACION_MS.otro - 100))
    rerender(<AppNotification message="Guardado." type="success" onClose={() => cerrar()} />)
    act(() => vi.advanceTimersByTime(100))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })
})
