import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useFiltrosUrl } from './useFiltrosUrl'

const DEFECTO = { fecha_inicio: '', fecha_fin: '', query: '' }

function Tabla() {
  const [filters, setFilters] = useFiltrosUrl(DEFECTO)
  const location = useLocation()
  return (
    <>
      <output data-testid="url">{location.search}</output>
      <output data-testid="filtros">{JSON.stringify(filters)}</output>
      <button onClick={() => setFilters(f => ({ ...f, query: '2424' }))}>Buscar</button>
      <button onClick={() => setFilters(DEFECTO)}>Limpiar</button>
    </>
  )
}

const renderEn = (ruta) => render(
  <MemoryRouter initialEntries={[ruta]}>
    <Tabla />
  </MemoryRouter>
)

describe('useFiltrosUrl', () => {
  it('inicializa los filtros desde la URL', () => {
    renderEn('/caja?fecha_inicio=2026-09-01&query=2424')
    expect(screen.getByTestId('filtros')).toHaveTextContent('{"fecha_inicio":"2026-09-01","fecha_fin":"","query":"2424"}')
  })

  it('escribe los filtros en la URL y omite los vacíos', () => {
    renderEn('/caja')
    fireEvent.click(screen.getByText('Buscar'))
    expect(screen.getByTestId('url')).toHaveTextContent('query=2424')
    expect(screen.getByTestId('url').textContent).not.toMatch(/fecha_inicio|fecha_fin/)
  })

  it('limpiar quita los filtros de la URL pero conserva parámetros ajenos', () => {
    renderEn('/recibos?action=create&query=2424')
    fireEvent.click(screen.getByText('Limpiar'))
    expect(screen.getByTestId('url').textContent).toBe('?action=create')
  })

  it('al cambiar un filtro conserva los demás parámetros de la URL', () => {
    renderEn('/recibos?action=create')
    fireEvent.click(screen.getByText('Buscar'))
    const url = screen.getByTestId('url').textContent
    expect(url).toContain('action=create')
    expect(url).toContain('query=2424')
  })
})

describe('actualizaciones encadenadas', () => {
  function DosCambios() {
    const [filters, setFilters] = useFiltrosUrl(DEFECTO)
    const location = useLocation()
    return (
      <>
        <output data-testid="url">{location.search}</output>
        <output data-testid="filtros">{JSON.stringify(filters)}</output>
        <button onClick={() => {
          // Mismo patrón que "categoría cambia y reinicia subcategoría".
          setFilters(f => ({ ...f, fecha_inicio: '2026-09-01' }))
          setFilters(f => ({ ...f, query: '' }))
          setFilters(f => ({ ...f, fecha_fin: '2026-09-30' }))
        }}>Aplicar</button>
      </>
    )
  }

  it('varias actualizaciones funcionales en el mismo evento no se pisan', () => {
    render(
      <MemoryRouter initialEntries={['/inv?query=mesa']}>
        <DosCambios />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByText('Aplicar'))
    expect(screen.getByTestId('filtros')).toHaveTextContent('{"fecha_inicio":"2026-09-01","fecha_fin":"2026-09-30","query":""}')
    const url = screen.getByTestId('url').textContent
    expect(url).toContain('fecha_inicio=2026-09-01')
    expect(url).toContain('fecha_fin=2026-09-30')
    expect(url).not.toContain('query')
  })
})
