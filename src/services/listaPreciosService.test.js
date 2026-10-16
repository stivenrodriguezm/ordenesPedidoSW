import { describe, expect, it, vi } from 'vitest'
import API from './api'
import {
  createCotizacion,
  getCotizaciones,
  getCotizacion,
  cambiarEstadoCotizacion,
  convertirCotizacionAVenta,
  simularMultiplicador,
  getLinea,
  getReferenciasPrecios,
  getCategorias,
} from './listaPreciosService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('listaPreciosService - Cotizaciones del servidor (P09-01, P09-04)', () => {
  it('lee referencias y clasificación de origen para la captura unificada', async () => {
    API.get.mockResolvedValueOnce({ data: [{ id: 101, nombre: 'Detroit', linea: null }] });
    expect(await getReferenciasPrecios()).toEqual([{ id: 101, nombre: 'Detroit', linea: null }]);
    expect(API.get).toHaveBeenLastCalledWith('/listaprecios/referencias/');
    API.get.mockResolvedValueOnce({ data: [{ id: 2, nombre: 'Sala' }] });
    expect(await getCategorias()).toEqual([{ id: 2, nombre: 'Sala' }]);
    expect(API.get).toHaveBeenLastCalledWith('/listaprecios/clasificacion/');
  });
  it('permite cancelar un detalle reemplazado por una edición más reciente', async () => {
    const signal = new AbortController().signal;
    API.get.mockResolvedValueOnce({ data: { id: 5, variantes: [] } });
    expect(await getLinea(5, { signal })).toEqual({ id: 5, variantes: [] });
    expect(API.get).toHaveBeenCalledWith('/listaprecios/lineas/5/', { signal });
  });
  it('createCotizacion envía el payload correcto a /listaprecios/cotizaciones/', async () => {
    const mockRes = { id: 10, numero: 'COT-1010', total: '150000.00' }
    API.post.mockResolvedValueOnce({ data: mockRes })

    const payload = {
      cliente_nombre: 'Prueba Cliente',
      lineas: [{ variante: 1, cantidad: 2, precio_unitario: '75000.00' }],
    }
    const res = await createCotizacion(payload)

    expect(API.post).toHaveBeenCalledWith('/listaprecios/cotizaciones/', payload)
    expect(res).toEqual(mockRes)
  })

  it('getCotizaciones consulta el listado con filtros', async () => {
    API.get.mockResolvedValueOnce({ data: { results: [{ id: 1, numero: 'COT-1001' }] } })

    const res = await getCotizaciones({ estado: 'emitida' })
    expect(API.get).toHaveBeenCalledWith('/listaprecios/cotizaciones/', { params: { estado: 'emitida' } })
    expect(res.results).toHaveLength(1)
  })

  it('getCotizacion consulta el detalle por id', async () => {
    API.get.mockResolvedValueOnce({ data: { id: 1, numero: 'COT-1001' } })

    const res = await getCotizacion(1)
    expect(API.get).toHaveBeenCalledWith('/listaprecios/cotizaciones/1/')
    expect(res.numero).toBe('COT-1001')
  })

  it('cambiarEstadoCotizacion envía la transición de estado', async () => {
    API.post.mockResolvedValueOnce({ data: { message: 'Estado cambiado', estado: 'aceptada' } })

    const res = await cambiarEstadoCotizacion(5, 'aceptada')
    expect(API.post).toHaveBeenCalledWith('/listaprecios/cotizaciones/5/cambiar-estado/', { estado: 'aceptada' })
    expect(res.estado).toBe('aceptada')
  })

  it('convertirCotizacionAVenta envía la petición de conversión a venta', async () => {
    const mockVenta = { message: 'Venta creada', venta_id: 2050, cliente_id: 15 }
    API.post.mockResolvedValueOnce({ data: mockVenta })

    const res = await convertirCotizacionAVenta(5, { sede: 'Lottus 1' })
    expect(API.post).toHaveBeenCalledWith('/listaprecios/cotizaciones/5/convertir-a-venta/', { sede: 'Lottus 1' })
    expect(res.venta_id).toBe(2050)
  })

  it('simularMultiplicador envía nuevo valor a la API de simulación', async () => {
    const mockSim = { multiplicador_id: 2, valor_actual: '2.00', valor_nuevo: '2.25', variantes_afectadas: 15 }
    API.post.mockResolvedValueOnce({ data: mockSim })

    const res = await simularMultiplicador(2, '2.25')
    expect(API.post).toHaveBeenCalledWith('/listaprecios/multiplicadores/2/simular/', { nuevo_valor: '2.25' })
    expect(res.variantes_afectadas).toBe(15)
  })
})
