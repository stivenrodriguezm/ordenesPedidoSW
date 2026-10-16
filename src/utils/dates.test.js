import { describe, expect, it } from 'vitest'
import { parseLocalDate, formatDate } from './dates'

describe('fechas locales', () => {
  it('parsea YYYY-MM-DD sin desfase de zona horaria', () => {
    const d = parseLocalDate('2026-01-05')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(5)
  })

  it('formatea vacío sin romper', () => {
    expect(() => formatDate('')).not.toThrow()
  })
})
