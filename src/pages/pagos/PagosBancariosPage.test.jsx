import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../../AppContext';
import PagosBancariosPage, { PrepararNomina, EditorLote } from './PagosBancariosPage';
import * as api from '../../services/pagosBancariosService';

vi.mock('../../services/pagosBancariosService', () => Object.fromEntries(['catalogo','cuentas','guardarCuenta','empleados','guardarEmpleado','pendientes','lotes','lote','crearLote','guardarLote','anularLote','corregirLote','programacion','guardarProgramacion','confirmarCE','descargarArchivo','beneficiarios','eliminarCuenta'].map(k => [k, vi.fn()])));

const cuenta = { id: 1, empresa: true, banco: '51', banco_nombre: 'Davivienda', tipo: 'CA', numero: '000123456', activa: true, nombres: 'Persona', apellidos: 'Prueba' };
const lote = () => ({ id: 2, tipo: 'nomina', nombre: 'Nómina de prueba', fecha_pago: '2099-10-25', estado: 'borrador', revision: 1, huella_revision: 'huella-prueba', cuenta_origen: 1, origen_snapshot: {}, cantidad: 1, confirmados: 0, total: '3000000.00', validaciones: [],
    pagos: [{ id: 4, empleado: 3, beneficiario: 'Ana de prueba', valor: '3000000.00', incluido: true, cuenta: 1, concepto: 'Pago mensual' }] });
function montar(url = '/comprobantes-egreso/pagos?tipo=nomina&lote=2', permissions = ['ALL']) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    const contenido = url.includes('lote=2') ? <EditorDePrueba /> : <PagosBancariosPage />;
    return render(<QueryClientProvider client={qc}><AppContext.Provider value={{ usuario: { id: 1, role: permissions.includes('ALL') ? 'administrador' : 'auxiliar', permissions } }}><MemoryRouter initialEntries={[url]}>{contenido}</MemoryRouter></AppContext.Provider></QueryClientProvider>);
}
function EditorDePrueba() {
    const [d,setD] = React.useState(lote());
    return <EditorLote key={`${d.id}-${d.revision}`} lote={d} actualizado={setD} puedeEditar puedeExportar />;
}
beforeEach(() => {
    vi.resetAllMocks();
    api.lotes.mockResolvedValue([lote()]); api.lote.mockResolvedValue(lote()); api.cuentas.mockResolvedValue([cuenta]);
    api.catalogo.mockResolvedValue({ bancos: { 51: 'Davivienda' }, documentos: { '01': 'Cédula' }, tipos: { CA: 'Ahorros' } });
    api.empleados.mockResolvedValue({ empleados: [], usuarios: [] }); api.beneficiarios.mockResolvedValue([]); api.programacion.mockResolvedValue({ activa:false,dia:25,revision:0,cuenta_origen_id:1 });
});

describe('Preparación bancaria', () => {
    it('guarda el importe escrito sin blur y bloquea descargar mientras hay cambios', async () => {
        const u = userEvent.setup(); montar();
        const campo = await screen.findByRole('textbox', { name: 'Pago de Ana de prueba' });
        expect(campo).toHaveValue('$3.000.000');
        await u.clear(campo); await u.type(campo, '3.250.000');
        expect(screen.getByRole('button', { name: 'Revisar y descargar' })).toBeDisabled();
        api.guardarLote.mockResolvedValue({ ...lote(), revision: 2, total: '3250000.00', pagos: [{ ...lote().pagos[0], valor: '3250000.00' }] });
        await u.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        await waitFor(() => expect(api.guardarLote).toHaveBeenCalledWith(2, expect.objectContaining({ pagos: [expect.objectContaining({ valor: '3250000' })] })));
        expect(await screen.findByRole('textbox', { name: 'Pago de Ana de prueba' })).toHaveValue('$3.250.000');
    });
    it('un importe vacío no se transforma en cero', async () => {
        const u = userEvent.setup(); montar();
        await u.clear(await screen.findByRole('textbox', { name: 'Pago de Ana de prueba' }));
        await u.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('sin decimales');
        expect(api.guardarLote).not.toHaveBeenCalled();
    });
    it('preserva el importe cuando el servidor rechaza el guardado', async () => {
        const u = userEvent.setup(); montar();
        const campo = await screen.findByRole('textbox', { name: 'Pago de Ana de prueba' });
        await u.clear(campo); await u.type(campo, '3100000');
        api.guardarLote.mockRejectedValue({ response: { status: 409, data: { detail: 'Otra persona modificó este lote.' } } });
        await u.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona');
        expect(campo).toHaveValue('$3.100.000');
    });
    it('descargar exige revisar y nunca confirma pagos', async () => {
        const u = userEvent.setup(); montar();
        await u.click(await screen.findByRole('button', { name: 'Revisar y descargar' }));
        expect(api.descargarArchivo).not.toHaveBeenCalled();
        expect(await screen.findByRole('dialog', { name: 'Revisa antes de generar el archivo' })).toHaveTextContent('Los pagos quedarán por confirmar');
        api.descargarArchivo.mockResolvedValue(); api.lote.mockResolvedValue({ ...lote(), estado: 'exportado', revision: 2 });
        await u.click(screen.getByRole('button', { name: 'Generar y descargar Excel' }));
        await waitFor(() => expect(api.descargarArchivo).toHaveBeenCalledWith(2, 1, 'huella-prueba'));
        expect(api.confirmarCE).not.toHaveBeenCalled();
    });
    it('no muestra empleados ni carga nómina a quien no tiene permiso', async () => {
        montar('/comprobantes-egreso/pagos?tipo=nomina', ['VER_COMPROBANTES_EGRESO', 'VER_TODOS_EGRESOS']);
        expect(await screen.findByRole('alert')).toHaveTextContent('No tienes acceso');
        expect(api.empleados).not.toHaveBeenCalled(); expect(api.lotes).not.toHaveBeenCalled();
    });

    it('confirma el guardado de programación y conserva la revisión para editar de nuevo', async () => {
        const u=userEvent.setup();
        api.programacion.mockResolvedValue({activa:false,dia:25,revision:0,cuenta_origen_id:1});
        api.guardarProgramacion.mockImplementation(async d=>({...d,cuenta_origen_id:d.cuenta_origen,revision:d.revision+1}));
        montar('/comprobantes-egreso/pagos?tipo=nomina');
        await u.click(screen.getByRole('button',{name:'Nómina mensual',exact:true}));
        const dia=await screen.findByRole('combobox',{name:'Día del mes'});
        await u.selectOptions(dia,'26');
        await u.click(screen.getByRole('button',{name:'Guardar programación'}));
        expect(await screen.findByText('Programación guardada.')).toBeInTheDocument();
        await u.selectOptions(dia,'27');
        expect(screen.queryByText('Programación guardada.')).not.toBeInTheDocument();
        await u.click(screen.getByRole('button',{name:'Guardar programación'}));
        await waitFor(()=>expect(api.guardarProgramacion).toHaveBeenLastCalledWith(expect.objectContaining({revision:1,dia:27})));
    });

    it('prepara el mes seleccionado sin confundirlo con el mes actual', async () => {
        const u=userEvent.setup();
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        render(<QueryClientProvider client={qc}><PrepararNomina abrir={vi.fn()} cerrar={vi.fn()} /></QueryClientProvider>);
        const dialogo=screen.getByRole('dialog',{name:'Preparar nómina del mes'});
        fireEvent.change(within(dialogo).getByLabelText('Mes de pago'),{target:{value:'2027-02'}});
        api.crearLote.mockResolvedValue({...lote(),nombre:'Nómina febrero',revision:0});
        await u.click(within(dialogo).getByRole('button',{name:'Preparar nómina',exact:true}));
        await waitFor(()=>expect(api.crearLote).toHaveBeenCalledWith({tipo:'nomina',periodo:'2027-02'},expect.any(Object)));
    });
    it('administra cuentas por beneficiario y dirige la preparación a CE', async () => {
        const u=userEvent.setup();
        api.beneficiarios.mockResolvedValue([{clave:'proveedor:4',titular:{proveedor:4},nombre:'Proveedor asociado',tipo:'Proveedor',cuentas:1,bancos:['Davivienda']}]);
        montar('/comprobantes-egreso/pagos?tipo=proveedores');
        await u.click(await screen.findByRole('button',{name:'Proveedor asociado Proveedor 1 cuenta Davivienda'}));
        expect(await screen.findByText('Beneficiario asociado')).toBeInTheDocument();
        expect(api.cuentas).toHaveBeenCalledWith({proveedor:4});
        expect(api.pendientes).not.toHaveBeenCalled();
        expect(api.crearLote).not.toHaveBeenCalled();
    });

});
