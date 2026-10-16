import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIdempotencia, mensajeDeError } from './useIdempotencia'

describe('useIdempotencia', () => {
  it('reusa la clave para el mismo contenido y la cambia si cambia el contenido', () => {
    const { result } = renderHook(() => useIdempotencia())
    const a = result.current.cabeceras({ valor: 10 })['Idempotency-Key']
    expect(result.current.cabeceras({ valor: 10 })['Idempotency-Key']).toBe(a)
    expect(result.current.cabeceras({ valor: 11 })['Idempotency-Key']).not.toBe(a)
  })

  it('tras confirmar, un nuevo envío idéntico es otra operación', () => {
    const { result } = renderHook(() => useIdempotencia())
    const a = result.current.cabeceras({ valor: 10 })['Idempotency-Key']
    result.current.confirmar()
    expect(result.current.cabeceras({ valor: 10 })['Idempotency-Key']).not.toBe(a)
  })
})

describe('mensajeDeError', () => {
  it('prefiere el mensaje del servidor (p. ej. saldo insuficiente)', () => {
    expect(mensajeDeError({ response: { data: { detail: 'Saldo insuficiente en caja.' } } }, 'x')).toBe('Saldo insuficiente en caja.')
    expect(mensajeDeError({ response: { data: { valor: ['El campo valor debe ser mayor a cero.'] } } }, 'x')).toBe('Valor: El campo valor debe ser mayor a cero.')
  })
  it('distingue la falta de respuesta (resultado incierto)', () => {
    expect(mensajeDeError({ request: {} }, 'x')).toMatch(/Sin respuesta/)
  })
})
