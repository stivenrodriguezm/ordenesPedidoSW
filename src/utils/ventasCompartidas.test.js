import { describe, expect, it } from 'vitest'
import { fraccionVenta, numeroParticipantes, participantesVenta } from './ventasCompartidas'

describe('ventas compartidas', () => {
  it('300 entre tres → N = 3', () => {
    expect(300 / numeroParticipantes({ vendedor: 1, vendedores_compartidos: [2, 3] })).toBe(100)
  })
  it('el principal repetido entre compartidos no cuenta dos veces', () => {
    expect(numeroParticipantes({ vendedor: 1, vendedores_compartidos: [1, 2] })).toBe(2)
    expect([...participantesVenta({ vendedor: 1, vendedores_compartidos: ['1', 2] })]).toEqual(['1', '2'])
  })
  it('venta sin compartidos', () => {
    expect(numeroParticipantes({ vendedor: 7, vendedores_compartidos: [] })).toBe(1)
  })
  it('fracción según quién se cuenta', () => {
    const venta = { vendedor: 1, vendedores_compartidos: [2] }
    expect(fraccionVenta(venta, null)).toBe(1)
    expect(fraccionVenta(venta, id => id === '1')).toBe(0.5)
    expect(fraccionVenta({ vendedor: 1, vendedores_compartidos: [2, 3] }, id => id !== '3')).toBeCloseTo(2 / 3)
    expect(fraccionVenta(venta, () => false)).toBe(0)
  })
})
