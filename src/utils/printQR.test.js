import { describe, expect, it } from 'vitest'
import { construirEtiquetaQR } from './printQR'

describe('etiqueta QR', () => {
  it('trata nombre e id maliciosos como texto, sin crear nodos ejecutables', () => {
    const doc = document.implementation.createHTMLDocument('x')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const nombre = '<img src=x onerror="alert(1)"><script>alert(2)</script>'
    construirEtiquetaQR(doc, { svg, id: '"><b>X</b>', nombre })

    expect(doc.querySelector('img')).toBeNull()
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.querySelector('b')).toBeNull()
    expect(doc.body.textContent).toContain(nombre)
    expect(doc.body.textContent).toContain('ID: "><b>X</b>')
    expect(doc.querySelector('svg')).not.toBeNull()
  })

  it('caracteres especiales y nombre vacío', () => {
    const doc = document.implementation.createHTMLDocument('x')
    construirEtiquetaQR(doc, { svg: null, id: 'SA1000', nombre: 'Sofá "Ñandú" & cía' })
    expect(doc.body.textContent).toContain('Sofá "Ñandú" & cía')
  })
})
