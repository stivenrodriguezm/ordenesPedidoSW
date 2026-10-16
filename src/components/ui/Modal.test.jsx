import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'
import ModalAnterior from '../Modal'

function Pantalla({ Componente = Modal, anidado = false }) {
  const [abierto, setAbierto] = useState(false)
  const [interno, setInterno] = useState(false)
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir</button>
      <Componente open={abierto} onClose={() => setAbierto(false)} title="Nuevo egreso">
        <input aria-label="Valor" />
        <button onClick={() => setInterno(true)}>Guardar</button>
        {anidado && (
          <Modal open={interno} onClose={() => setInterno(false)} title="Confirmar">
            <button>Sí</button>
          </Modal>
        )}
      </Componente>
    </>
  )
}

describe.each([['ui/Modal', Modal], ['Modal anterior', ModalAnterior]])('%s', (_nombre, Componente) => {
  it('tiene nombre accesible, enfoca el primer campo y devuelve el foco al cerrar', async () => {
    const user = userEvent.setup()
    render(<Pantalla Componente={Componente} />)
    const abrir = screen.getByText('Abrir')
    await user.click(abrir)
    expect(screen.getByRole('dialog', { name: 'Nuevo egreso' })).toBeInTheDocument()
    expect(screen.getByLabelText('Valor')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  it('confina el foco con Tab y Shift+Tab', async () => {
    const user = userEvent.setup()
    render(<Pantalla Componente={Componente} />)
    await user.click(screen.getByText('Abrir'))
    await user.tab() // Valor → Guardar (último)
    expect(screen.getByText('Guardar')).toHaveFocus()
    await user.tab() // vuelve al primero (la X)
    expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByText('Guardar')).toHaveFocus()
  })
})

describe('diálogos anidados', () => {
  it('Escape cierra solo el de arriba y el scroll se libera al cerrar el último', async () => {
    const user = userEvent.setup()
    render(<Pantalla anidado />)
    await user.click(screen.getByText('Abrir'))
    await user.click(screen.getByText('Guardar'))
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nuevo egreso' })).toBeInTheDocument()
    expect(screen.getByText('Guardar')).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('cambios sin guardar', () => {
  function Formulario() {
    const [abierto, setAbierto] = useState(true)
    const [valor, setValor] = useState('')
    return (
      <Modal open={abierto} onClose={() => setAbierto(false)} title="Movimiento" hayCambios={Boolean(valor)}>
        <input aria-label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
        <button onClick={() => setAbierto(false)}>Cancelar</button>
      </Modal>
    )
  }

  it('Escape y clic fuera piden confirmación; Cancelar cierra directo', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Formulario />)
    await user.keyboard('{Escape}') // sin cambios: cierra sin preguntar
    expect(confirmar).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    confirmar.mockRestore()
  })

  it('con datos escritos no descarta si el usuario no confirma', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Formulario />)
    await user.type(screen.getByLabelText('Valor'), '5000')
    await user.keyboard('{Escape}')
    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Valor')).toHaveValue('5000')
    await user.pointer({ keys: '[MouseLeft>]', target: document.querySelector('.ds-modal-overlay') })
    expect(confirmar).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    confirmar.mockReturnValue(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    confirmar.mockRestore()
  })
})
