import { describe, expect, it, vi } from 'vitest'
import { ListadoDemasiadoGrande, obtenerTodasLasPaginas } from './paginacion'

// API ficticia que pagina de a 100 como el backend (max_page_size = 100).
const apiPaginada = (todos, envolver = (d) => d) => ({
  get: vi.fn(async (_url, { params }) => {
    const desde = (params.page - 1) * 100
    const results = todos.slice(desde, desde + 100)
    const next = desde + 100 < todos.length ? `http://api.invalid/x/?page=${params.page + 1}` : null
    return { data: envolver({ count: todos.length, results, next }) }
  }),
})

describe('obtenerTodasLasPaginas', () => {
  it('pide páginas sucesivas hasta reunir los 103 proveedores', async () => {
    const todos = Array.from({ length: 103 }, (_, i) => ({ id: i + 1 }))
    const api = apiPaginada(todos)
    const r = await obtenerTodasLasPaginas(api, '/proveedores/')
    expect(r).toHaveLength(103)
    expect(api.get).toHaveBeenCalledTimes(2)
    // Pide por número de página al mismo path, no al `next` absoluto.
    expect(api.get.mock.calls.map(([url, { params }]) => [url, params.page])).toEqual([['/proveedores/', 1], ['/proveedores/', 2]])
  })

  it('conserva los filtros y adapta respuestas anidadas (caja)', async () => {
    const todos = Array.from({ length: 250 }, (_, i) => ({ id: i + 1 }))
    const api = apiPaginada(todos, (pagina) => ({ saldo: 0, movimientos: pagina }))
    const r = await obtenerTodasLasPaginas(api, '/caja/', { tipo: 'ingreso' }, { extraer: (d) => d.movimientos })
    expect(r).toHaveLength(250)
    expect(api.get.mock.calls.every(([, { params }]) => params.tipo === 'ingreso')).toBe(true)
  })

  it('en modo estricto falla en vez de devolver una exportación incompleta', async () => {
    const api = apiPaginada(Array.from({ length: 250 }, (_, i) => ({ id: i })))
    await expect(obtenerTodasLasPaginas(api, '/x/', {}, { maxPaginas: 2, estricto: true }))
      .rejects.toBeInstanceOf(ListadoDemasiadoGrande)
  })

  it('acepta respuestas sin paginar', async () => {
    const api = { get: vi.fn(async () => ({ data: [{ id: 1 }] })) }
    expect(await obtenerTodasLasPaginas(api, '/x/')).toEqual([{ id: 1 }])
  })
})
