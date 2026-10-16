import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppContext } from './AppContext'
import PrivateRoute from './PrivateRoute'

const renderCon = (valor) => render(
  <AppContext.Provider value={valor}>
    <MemoryRouter>
      <PrivateRoute><p>contenido privado</p></PrivateRoute>
    </MemoryRouter>
  </AppContext.Provider>
)

describe('PrivateRoute', () => {
  it('la invitación abre la oficina sin habilitar IA ni ventas', () => {
    localStorage.setItem('accessToken', 'token-de-prueba')
    const usuario={role:'transportador',permissions:[],acceso_oficina:true}
    render(<AppContext.Provider value={{usuario,isLoading:false}}><MemoryRouter>
      <PrivateRoute feature="ACCESO_OFICINA"><p>oficina humana</p></PrivateRoute>
      <PrivateRoute feature="USAR_ASISTENTE_IA"><p>IA privada</p></PrivateRoute>
      <PrivateRoute feature="VER_VENTAS"><p>ventas privadas</p></PrivateRoute>
    </MemoryRouter></AppContext.Provider>)
    expect(screen.getByText('oficina humana')).toBeInTheDocument()
    expect(screen.queryByText('IA privada')).not.toBeInTheDocument()
    expect(screen.queryByText('ventas privadas')).not.toBeInTheDocument()
  })

  it('retirar la invitación cierra la oficina para una persona sin permiso de IA', () => {
    localStorage.setItem('accessToken', 'token-de-prueba')
    render(<AppContext.Provider value={{usuario:{role:'transportador',permissions:[],acceso_oficina:false},isLoading:false}}><MemoryRouter>
      <PrivateRoute feature="ACCESO_OFICINA"><p>oficina humana</p></PrivateRoute>
    </MemoryRouter></AppContext.Provider>)
    expect(screen.queryByText('oficina humana')).not.toBeInTheDocument()
  })

  it('muestra un error recuperable en vez de un loader infinito cuando /user/ falla', async () => {
    localStorage.setItem('accessToken', 'token-de-prueba')
    const retrySession = vi.fn()
    renderCon({ usuario: null, isLoading: false, sessionError: 'No hay conexión con el servidor.', retrySession })
    expect(screen.getByText('No hay conexión con el servidor.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button'))
    expect(retrySession).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('contenido privado')).toBeNull()
  })

  it('muestra el contenido con sesión válida', () => {
    localStorage.setItem('accessToken', 'token-de-prueba')
    renderCon({ usuario: { role: 'administrador', permissions: ['ALL'] }, isLoading: false, sessionError: null })
    expect(screen.getByText('contenido privado')).toBeInTheDocument()
  })
})
