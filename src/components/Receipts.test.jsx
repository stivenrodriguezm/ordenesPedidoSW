import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComprobanteEgresoReceipt from './ComprobanteEgresoReceipt'
import CotizacionReceipt from './CotizacionReceipt'

describe('ComprobanteEgresoReceipt (P08-09 / U08)', () => {
  it('imprime siempre "Estado: Pagado" independientemente del estado en BD', () => {
    const comprobanteEnProceso = {
      id: 42,
      fecha: '2026-10-02',
      medio_pago: 'Transferencia',
      estado: 'Por Confirmar Pago',
      proveedor_nombre: 'Maderas El Roble',
      valor: '1500000',
      facturas_detalle: [
        { id: 101, id_manual: 'FAC-101', fecha_factura: '2026-10-01', valor: '1500000', productos: [] }
      ],
    }

    render(<ComprobanteEgresoReceipt comprobante={comprobanteEnProceso} />)

    // Invariante de negocio: el documento impreso siempre dice "Estado: Pagado"
    expect(screen.getByText(/Estado:\s*Pagado/i)).toBeInTheDocument()
    expect(screen.getByText(/No\. CE-42/)).toBeInTheDocument()
    expect(screen.getAllByText(/Maderas El Roble/).length).toBeGreaterThanOrEqual(1)
    // Nota semántica visible para el operador
    expect(screen.getByText(/Nota operativa/i)).toBeInTheDocument()
    expect(screen.getByText(/Doc v1\.0/i)).toBeInTheDocument()
  })

  it('renderiza facturas con productos, conceptos adicionales y desglose', () => {
    const comprobante = {
      id: 88,
      fecha: '2026-10-02',
      medio_pago: 'Efectivo',
      estado: 'Pagado',
      proveedor_nombre: 'Telas y Cueros SAS',
      valor: '350000',
      facturas_detalle: [
        {
          id: 201,
          id_manual: 'FC-201',
          fecha_factura: '2026-10-01',
          valor: '300000',
          productos: [
            { id: 1, referencia_nombre: 'Tela Velvet', cantidad: 2, costo: 150000, categoria_nombre: 'Telas' }
          ]
        }
      ],
      otros_conceptos: [
        { descripcion: 'Transporte urbano', valor: 50000 }
      ],
      descripcion: 'Pago quincenal de suministros',
    }

    render(<ComprobanteEgresoReceipt comprobante={comprobante} />)

    expect(screen.getByText(/#FC-201/)).toBeInTheDocument()
    expect(screen.getByText(/Tela Velvet/)).toBeInTheDocument()
    expect(screen.getByText(/Transporte urbano/)).toBeInTheDocument()
    expect(screen.getByText(/Pago quincenal de suministros/)).toBeInTheDocument()
  })

  it('no falla si el comprobante es nulo', () => {
    const { container } = render(<ComprobanteEgresoReceipt comprobante={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('CotizacionReceipt (P08-09 / U08)', () => {
  it('renderiza cabecera, cliente, asesor, productos y totales correctamente', () => {
    const items = [
      {
        id: 'item-1',
        lineaNombre: 'Sofá Praga',
        varianteNombre: '3 Puestos',
        categoriaNombre: 'Salas',
        grupoNombre: 'Grupo A',
        precioUnitario: 1200000,
        cantidad: 2,
        opcionales: [{ descripcion: 'Patas metálicas', valor: 80000 }],
        notas: 'Entrega en piso 3',
      }
    ]

    render(
      <CotizacionReceipt
        items={items}
        cliente="Carlos Mendoza"
        vendedorNombre="María Asesora"
        folio="COT-2026-001"
      />
    )

    expect(screen.getByText(/No\. COT-2026-001/)).toBeInTheDocument()
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument()
    expect(screen.getByText('María Asesora')).toBeInTheDocument()
    expect(screen.getByText(/Sofá Praga — 3 Puestos/)).toBeInTheDocument()
    expect(screen.getByText(/Patas metálicas/)).toBeInTheDocument()
    expect(screen.getByText(/Entrega en piso 3/)).toBeInTheDocument()
    expect(screen.getByText(/Doc v1\.0/)).toBeInTheDocument()
    expect(screen.getByText(/Aceptación del cliente/i)).toBeInTheDocument()
  })
})
