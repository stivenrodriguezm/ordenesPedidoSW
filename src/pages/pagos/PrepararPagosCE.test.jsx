import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../../AppContext';
import ComprobantesEgreso from '../ComprobantesEgreso';
import PrepararPagosCE from './PrepararPagosCE';
import * as api from '../../services/pagosBancariosService';

vi.mock('../../services/pagosBancariosService', () => Object.fromEntries(['catalogo','cuentas','beneficiarios','comprobantes','revisarCE','crearLote','lote','descargarArchivo','asociarCE','lotes'].map(k => [k, vi.fn()])));
vi.mock('../../hooks/useExportacion', () => ({ useExportacion: () => ({ exportar:vi.fn(), exportando:false }) }));
vi.mock('../../components/ComprobanteEgresoPrintModal', () => ({default:()=>null}));
const cuenta = { id:7, banco:'51', banco_nombre:'Davivienda', tipo:'CA', numero:'0001234', activa:true, principal:true };
const ce = (id=11) => ({id, proveedor:1, proveedor_nombre:'Proveedor de prueba', valor:'3000000.00', fecha:'2026-10-20', estado:'Por Confirmar Pago', medio_pago:'Transferencia', concepto:'Muebles', facturas_detalle:[{id:3,id_manual:'F-123',valor:'3000000.00',productos:[{id:'mueble-1',referencia_nombre:'Sofá Valencia',variacion:'220 cm',costo:'3000000.00'}]}], pago_bancario:{disponible:true,titular:{proveedor:1},cuenta:7,banco:'51',huella:'revision-ce',cuentas:[cuenta]}});
function montar(comp, permisos = ['ALL']) {
    const qc = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false}}});
    return render(<QueryClientProvider client={qc}><AppContext.Provider value={{usuario:{id:1,role:permisos.includes('ALL') ? 'administrador' : 'auxiliar',permissions:permisos},proveedores:[{id:1,nombre_empresa:'Proveedor de prueba'}]}}><MemoryRouter>{comp}</MemoryRouter></AppContext.Provider></QueryClientProvider>);
}
beforeEach(()=>{
    vi.resetAllMocks();
    api.catalogo.mockResolvedValue({bancos:{51:'Davivienda',7:'Bancolombia'}});
    api.cuentas.mockResolvedValue([{...cuenta,empresa:true}]);
    api.beneficiarios.mockResolvedValue([]); api.lotes.mockResolvedValue([]);
    api.comprobantes.mockResolvedValue({count:2,results:[ce(),{...ce(12),pago_bancario:{...ce().pago_bancario,disponible:false,archivo:4}}]});
    api.revisarCE.mockResolvedValue([ce()]);
});

describe('Pagos desde CE',()=>{
    it('selecciona solo transferencias disponibles y permite revisar desde la tabla principal',async()=>{
        const u=userEvent.setup(); montar(<ComprobantesEgreso />);
        const tabla=await screen.findByRole('table');
        expect(await within(tabla).findByLabelText('Seleccionar CE 12')).toBeDisabled();
        await u.click(within(tabla).getByLabelText('Seleccionar CE 11'));
        expect(screen.getByRole('button',{name:'Revisar y pagar (1)'})).toBeEnabled();
        await u.click(screen.getByRole('button',{name:'Revisar y pagar (1)'}));
        expect(await screen.findByRole('dialog',{name:'Revisar y pagar los CE seleccionados'})).toHaveTextContent('Sofá Valencia');
        expect(api.revisarCE).toHaveBeenCalledWith([11]);
    });
    it('filtrar Davivienda consulta banco destino y solo transferencias disponibles',async()=>{
        const u=userEvent.setup(); montar(<ComprobantesEgreso />);
        await u.selectOptions(screen.getByLabelText('Banco destino'),'51');
        await waitFor(()=>expect(api.comprobantes).toHaveBeenLastCalledWith(expect.objectContaining({banco_destino:'51',solo_pagables:'1',page:1})));
    });
    it('seleccionar todos solicita hasta 500 CE con los filtros actuales y rechaza excederlos',async()=>{
        const u=userEvent.setup(); montar(<ComprobantesEgreso />);
        await screen.findByRole('table');
        api.comprobantes.mockResolvedValueOnce({count:501,results:[ce()]});
        await u.click(screen.getByRole('button',{name:'Seleccionar todos con estos filtros'}));
        await waitFor(()=>expect(api.comprobantes).toHaveBeenCalledWith(expect.objectContaining({page_size:500,solo_pagables:'1'})));
        expect(await screen.findByText(/Hay más de 500 CE/)).toBeInTheDocument();
        expect(screen.getByRole('button',{name:'Revisar y pagar'})).toBeDisabled();
    });
    it('revisa productos, importe y cuenta antes de generar y no confirma automáticamente',async()=>{
        const u=userEvent.setup();const preparado=vi.fn();
        montar(<PrepararPagosCE seleccion={[11]} preferencias={{}} cerrar={vi.fn()} preparado={preparado} />);
        expect(await screen.findByText('Sofá Valencia · 220 cm')).toBeInTheDocument();
        expect(api.crearLote).not.toHaveBeenCalled();
        const d={id:8,revision:1,huella_revision:'huella-grupo'};
        api.crearLote.mockResolvedValue(d);api.descargarArchivo.mockResolvedValue();api.lote.mockResolvedValue({...d,estado:'exportado'});
        await u.click(screen.getByRole('button',{name:'Generar y descargar Excel'}));
        await waitFor(()=>expect(api.crearLote).toHaveBeenCalledWith(expect.objectContaining({cuenta_origen:7,comprobantes:[11],pagos:[{comprobante:11,cuenta:7,huella:'revision-ce'}]}),expect.any(Object)));
        expect(api.descargarArchivo).toHaveBeenCalledWith(8,1,'huella-grupo');
        await waitFor(()=>expect(preparado).toHaveBeenCalled());
    });
    it('un error al descargar conserva la preparación y reintenta sin duplicar pagos',async()=>{
        const u=userEvent.setup(); montar(<PrepararPagosCE seleccion={[11]} preferencias={{}} cerrar={vi.fn()} preparado={vi.fn()} />);
        await screen.findByText('Sofá Valencia · 220 cm');
        const d={id:8,revision:1,huella_revision:'huella-grupo'};
        api.crearLote.mockResolvedValue(d);api.descargarArchivo.mockRejectedValueOnce({response:{data:{detail:'Sin conexión con la descarga.'}}});
        await u.click(screen.getByRole('button',{name:'Generar y descargar Excel'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
        api.descargarArchivo.mockResolvedValue();api.lote.mockResolvedValue({...d,estado:'exportado'});
        await u.click(screen.getByRole('button',{name:'Descargar archivo guardado'}));
        await waitFor(()=>expect(api.descargarArchivo).toHaveBeenCalledTimes(2));
        expect(api.crearLote).toHaveBeenCalledTimes(1);
    });
    it('no permite generar con CE que cambió o carece de cuenta',async()=>{
        api.revisarCE.mockResolvedValue([{...ce(),pago_bancario:{...ce().pago_bancario,disponible:false,cuenta:null}}]);
        montar(<PrepararPagosCE seleccion={[11]} preferencias={{}} cerrar={vi.fn()} preparado={vi.fn()} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('ya no están disponibles');
        expect(screen.getByRole('button',{name:'Generar y descargar Excel'})).toBeDisabled();
    });
    it('lee la fecha actual del campo al generar',async()=>{
        const u=userEvent.setup();montar(<PrepararPagosCE seleccion={[11]} preferencias={{}} cerrar={vi.fn()} preparado={vi.fn()} />);
        await screen.findByText('Sofá Valencia · 220 cm');
        fireEvent.change(screen.getByLabelText('Fecha de pago'),{target:{value:'2027-02-17'}});
        api.crearLote.mockRejectedValue({response:{data:{detail:'Ejemplo'}}});
        await u.click(screen.getByRole('button',{name:'Generar y descargar Excel'}));
        await waitFor(()=>expect(api.crearLote).toHaveBeenCalledWith(expect.objectContaining({fecha_pago:'2027-02-17'}),expect.any(Object)));
    });
    it('personal autorizado para nómina accede desde CE sin consultar pagos de proveedores',async()=>{
        api.lotes.mockResolvedValue([{id:19,tipo:'nomina',estado:'borrador',nombre:'Nómina de noviembre',cantidad:2,total:'4200000.00'}]);
        montar(<ComprobantesEgreso />,['VER_NOMINA','GESTIONAR_NOMINA']);
        expect(await screen.findByRole('button',{name:/Nómina de noviembre/})).toBeInTheDocument();
        expect(screen.getByRole('button',{name:'Preparar nómina'})).toBeInTheDocument();
        expect(api.comprobantes).not.toHaveBeenCalled();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('la confirmación individual conserva su diálogo antes de marcar un pago',async()=>{
        const u=userEvent.setup(); montar(<ComprobantesEgreso />);
        const tabla=await screen.findByRole('table');
        await u.click((await within(tabla).findAllByRole('button',{name:'Confirmar',exact:true}))[0]);
        expect(await screen.findByRole('dialog',{name:'Confirmar Transferencia de Egreso'})).toHaveTextContent('procesada y verificada correctamente');
        await u.click(screen.getByRole('button',{name:'Cancelar',exact:true}));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

});
