import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppContext, usePermissions } from './AppContext';

vi.mock('./services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } } }));

function Sonda({ codigo }) {
  const hasPermission = usePermissions();
  return <output>{hasPermission(codigo) ? 'si' : 'no'}</output>;
}
const con = (permissions, codigo) => {
  render(<AppContext.Provider value={{ usuario: { permissions } }}><Sonda codigo={codigo} /></AppContext.Provider>);
  return screen.getByRole('status').textContent;
};

describe('Ver comprobantes de egreso', () => {
  it.each([['ACCESO_EGRESOS'], ['VER_TODOS_EGRESOS'], ['VER_PROPIOS_EGRESOS'], ['VER_COMPROBANTES_EGRESO']])('%s muestra la tabla, como en el servidor', (permiso) => {
    expect(con([permiso], 'VER_COMPROBANTES_EGRESO')).toBe('si');
  });

  it('solo nómina abre la página pero no la tabla', () => {
    expect(con(['VER_NOMINA'], 'VER_COMPROBANTES_EGRESO')).toBe('no');
  });
});
