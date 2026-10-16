import { describe, expect, it } from 'vitest'
import { describirError, mensajeDeError } from './errores'

const err = (status, data) => ({ response: { status, data } })

describe('describirError', () => {
  it('distingue conexión, permiso, conflicto y servidor', () => {
    expect(describirError({ request: {} }).tipo).toBe('conexion')
    expect(describirError(err(403, { detail: 'No tienes permiso.' }))).toMatchObject({ tipo: 'permiso', mensaje: 'No tienes permiso.' })
    expect(describirError(err(409, { error: 'La factura tiene un pago asociado.' })).tipo).toBe('conflicto')
    expect(describirError(err(500, '<html>Traceback…</html>')).mensaje).toMatch(/Error del servidor/)
  })

  it('convierte errores por fila en texto legible, no JSON', () => {
    const r = describirError(err(400, { productos: { producto_2: { costo: ['Debe ser mayor o igual a 0.'] } } }))
    expect(r.tipo).toBe('validacion')
    expect(r.mensaje).toBe('Productos · Producto 2 · Costo: Debe ser mayor o igual a 0.')
    expect(r.campos).toEqual([{ ruta: ['Productos', 'Producto 2', 'Costo'], mensaje: 'Debe ser mayor o igual a 0.' }])
    expect(r.mensaje).not.toMatch(/[{}[\]"]/)
  })

  it('omite claves genéricas y no muestra HTML', () => {
    expect(mensajeDeError(err(400, { non_field_errors: ['Fechas inválidas.'] }))).toBe('Fechas inválidas.')
    expect(mensajeDeError(err(400, '<!doctype html><p>x</p>'), 'Error al guardar.')).toBe('Error al guardar.')
  })

  it('una sesión vencida avisa que los datos siguen en el formulario', () => {
    expect(describirError(err(401, { detail: 'Token inválido' }))).toMatchObject({ tipo: 'sesion', mensaje: expect.stringMatching(/siguen aquí/) })
  })
})
