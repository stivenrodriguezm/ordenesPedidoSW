import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import API from '../../services/api';
import AutomatizacionesIA from './AutomatizacionesIA';
import FichaAgente from './FichaAgente';
import {actividadAgente} from './actividadAgente';

vi.mock('../../services/api',()=>({default:{get:vi.fn(),post:vi.fn(),patch:vi.fn()}}));
const agente={id:4,nombre:'Analista aislado',rol:'Ventas',color:'verde',icono:'grafica'};
const tarea={id:12,perfil:4,es_general:false,perfil_nombre:agente.nombre,nombre:'Resumen diario',
    instrucciones:'Resume las ventas con las cifras actuales del período.',frecuencia:'semanal',hora:'09:00:00',
    dias_semana:[0,1,2,3,4],dia_mes:1,fecha_unica:null,fecha_fin:null,modelo:'',activa:true,archivada:false,
    agente_disponible:true,en_curso:0,sin_leer:0,ultima:null,proxima_ejecucion:'2026-10-12T14:00:00Z'};
let datos;
function montar(props={}){
    const cache=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
    return render(<QueryClientProvider client={cache}><AutomatizacionesIA agentes={[agente]} modelos={['modelo-a']} puedeProgramar onCerrar={vi.fn()} onResultado={vi.fn()} {...props}/></QueryClientProvider>);
}
beforeEach(()=>{
    vi.resetAllMocks(); datos={automatizaciones:[tarea],motor:{activo:true},puede_programar:true};
    API.get.mockImplementation(async url=>({data:url.includes('/ejecuciones/')?{resultados:[],siguiente:null}:datos}));
    API.post.mockResolvedValue({data:{id:2}});API.patch.mockResolvedValue({data:{}});
});
describe('Programación personal de agentes',()=>{
    it('crea una tarea semanal del agente con días y modelo, sin ejecuciones implícitas',async()=>{
        montar({agente,crear:true});
        fireEvent.click(screen.getByRole('button',{name:'Resumen comercial',exact:true}));
        fireEvent.click(screen.getByLabelText('Sábado'));
        fireEvent.change(screen.getByLabelText('Hora · Bogotá'),{target:{value:'08:30'}});
        fireEvent.change(screen.getByLabelText('Modelo'),{target:{value:'modelo-a'}});
        fireEvent.click(screen.getByRole('button',{name:'Crear automatización'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/automatizaciones/',expect.objectContaining({
            perfil:4,frecuencia:'semanal',hora:'08:30',dias_semana:[0,1,2,3,4,5],modelo:'modelo-a',activa:true}),
            {headers:{'Idempotency-Key':expect.any(String)}}));
        expect(API.post).toHaveBeenCalledTimes(1);
    });
    it('envía una única fecha con zona de Bogotá explícita, aunque el navegador use otra zona',async()=>{
        montar({crear:true});
        fireEvent.click(screen.getByRole('button',{name:'Ideas para LOTTUS',exact:true}));
        fireEvent.change(screen.getByLabelText('Repetición'),{target:{value:'una_vez'}});
        fireEvent.change(screen.getByLabelText('Fecha y hora · Bogotá'),{target:{value:'2030-10-12T16:35'}});
        fireEvent.click(screen.getByRole('button',{name:'Crear automatización'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/automatizaciones/',expect.objectContaining({perfil:null,fecha_unica:'2030-10-12T16:35:00-05:00'}),expect.any(Object)));
    });
    it('conserva el mismo intento tras una respuesta incierta y muestra el error en el formulario',async()=>{
        API.post.mockRejectedValueOnce({response:{data:{error:'El resultado no pudo confirmarse.'}}});
        montar({crear:true});fireEvent.click(screen.getByRole('button',{name:'Resumen comercial',exact:true}));
        fireEvent.click(screen.getByRole('button',{name:'Crear automatización'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('El resultado no pudo confirmarse.');
        const clave=API.post.mock.calls[0][2].headers['Idempotency-Key'];
        fireEvent.click(screen.getByRole('button',{name:'Crear automatización'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledTimes(2));
        expect(API.post.mock.calls[1][2].headers['Idempotency-Key']).toBe(clave);
    });
    it('pausa y archiva conservando el historial, y restaura sin activar',async()=>{
        const vista=montar();await screen.findByText(tarea.nombre);
        fireEvent.click(screen.getByRole('button',{name:'Pausar'}));
        await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/asistente/automatizaciones/12/',{activa:false}));
        await waitFor(()=>expect(screen.getByRole('button',{name:'Archivar Resumen diario'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button',{name:'Archivar Resumen diario'}));
        await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/asistente/automatizaciones/12/',{archivada:true}));
        vista.unmount();datos.automatizaciones=[{...tarea,archivada:true,activa:false}];montar();
        fireEvent.click(await screen.findByRole('button',{name:'Restaurar pausada'}));
        await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/asistente/automatizaciones/12/',{archivada:false}));
        expect(screen.getByRole('button',{name:'Historial'})).toBeInTheDocument();
    });
    it('impide iniciar una tarea sin motor o con agente no disponible; permite consultar historial',async()=>{
        datos.motor.activo=false;datos.automatizaciones=[{...tarea,agente_disponible:false}];montar();
        expect(await screen.findByRole('button',{name:'Ejecutar ahora'})).toBeDisabled();
        expect(screen.getByText(/El agente está pausado/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Historial'}));
        expect(await screen.findByText('Esta tarea aún no tiene ejecuciones.')).toBeInTheDocument();
        expect(API.post).not.toHaveBeenCalled();
    });
    it('encola una ejecución manual con una clave sin modificar el horario',async()=>{
        montar();fireEvent.click(await screen.findByRole('button',{name:'Ejecutar ahora'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/automatizaciones/12/ejecutar/',{},
            {headers:{'Idempotency-Key':expect.any(String)}}));
        expect(API.patch).not.toHaveBeenCalled();
    });
    it('marca el resultado como leído y abre la conversación privada correspondiente',async()=>{
        const respuesta={id:7,nombre:tarea.nombre,estado:'listo',creada:'2026-10-12T14:00:00Z',resultado:'Resultado aislado',conversacion:15};
        datos.automatizaciones=[{...tarea,ultima:respuesta,sin_leer:1}];const abrir=vi.fn();montar({onResultado:abrir});
        fireEvent.click(await screen.findByRole('button',{name:'Abrir resultado'}));
        await waitFor(()=>expect(abrir).toHaveBeenCalledWith(respuesta));
        expect(API.patch).toHaveBeenCalledWith('/asistente/ejecuciones/7/',{leida:true});
    });
    it('un lector consulta sus tareas sin controles de creación o ejecución',async()=>{
        montar({puedeProgramar:false});await screen.findByText(tarea.nombre);
        expect(screen.getByRole('button',{name:'Historial'})).toBeInTheDocument();
        expect(screen.queryByRole('button',{name:'Nueva tarea'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button',{name:'Ejecutar ahora'})).not.toBeInTheDocument();
    });
});
describe('Ficha de actividad',()=>{
    it('abre por acercamiento, muestra únicamente las novedades de este agente y admite teclado',()=>{
        const info=actividadAgente({motor:{activo:true},automatizaciones:[tarea],en_curso:[{perfil:4,es_general:false,nombre:'Análisis actual',estado:'ejecutando'}],
            pendientes:[{id:8,perfil:4,es_general:false,nombre:'Novedad propia',resultado:'Resultado para ti',estado:'listo'},
                {id:9,perfil:99,es_general:false,nombre:'Otro agente',resultado:'No corresponde',estado:'listo'}]},agente);
        const programar=vi.fn();render(<FichaAgente agente={agente} info={info} puedeProgramar onProgramar={programar} onResultado={vi.fn()} onConversar={vi.fn()}>
            {(id,abierta)=><button aria-describedby={abierta?id:undefined}>Puesto del agente</button>}</FichaAgente>);
        fireEvent.mouseEnter(screen.getByRole('button',{name:'Puesto del agente'}));
        const ficha=screen.getByRole('region',{name:'Actividad de Analista aislado'});
        expect(ficha).toHaveTextContent('Trabajando · Análisis actual');
        expect(ficha).toHaveTextContent('Novedad propia');expect(ficha).not.toHaveTextContent('Otro agente');
        fireEvent.keyDown(ficha,{key:'Escape'});expect(screen.queryByRole('region')).not.toBeInTheDocument();
        fireEvent.focus(screen.getByRole('button',{name:'Puesto del agente'}));expect(screen.getByRole('region')).toBeInTheDocument();
        fireEvent.click(within(screen.getByRole('region')).getByRole('button',{name:'Programar tarea'}));expect(programar).toHaveBeenCalledWith(agente,true);
        expect(screen.queryByRole('region')).not.toBeInTheDocument();
        fireEvent.focus(screen.getByRole('button',{name:'Puesto del agente'}));
        fireEvent(window,new Event('resize'));expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });
});
