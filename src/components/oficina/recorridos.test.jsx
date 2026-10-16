import {act,renderHook,render,screen,fireEvent} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import React from 'react';
import {useRecorridos} from './recorridos';
import {duracionPaso,puntoEnMovimiento,usePaseos} from './paseos';
import {actividadAgente,objetivoAgente,visitasEstrategicas} from './actividadAgente';
import {ContenidoFicha} from './FichaAgente';

const estaciones=[{clave:'ia-1',x:700,y:100},{clave:'persona-5',x:100,y:100},{clave:'ia-2',x:700,y:200}];
const evento=(id,actor,destino,tipo='entrega')=>({id,actor,destino,tipo,texto:`Actividad ${id}`,creado:new Date().toISOString()});
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('Recorridos de trabajo',()=>{
    it('quien recibe un encargo espera a que llegue el que se lo pide antes de ponerse a trabajar',()=>{
        const encargo={...evento(1,'ia-1','ia-2','solicitud'),texto:'Por favor, Alan, registra esta venta.'};
        const {result}=renderHook(()=>useRecorridos([encargo,evento(2,'ia-2','ia-2','trabajo')],estaciones));
        act(()=>vi.advanceTimersByTime(100));
        expect(result.current['ia-1'].fase).toBe('ida');
        expect(result.current['ia-2']).toBeUndefined();
        let pasos=0;
        while(result.current['ia-1']?.fase!=='visita'&&pasos++<200){act(()=>vi.advanceTimersByTime(250));expect(result.current['ia-2']).toBeUndefined();}
        expect(result.current['ia-1'].texto).toBe('Por favor, Alan, registra esta venta.');
        act(()=>vi.advanceTimersByTime(800));
        expect(result.current['ia-2'].fase).toBe('trabajo');
    });
    it('también espera si quien le encarga la tarea aún está analizando en su puesto',()=>{
        const analisis=evento(1,'ia-1','ia-1','trabajo');
        const encargo={...evento(2,'ia-1','ia-2','solicitud'),texto:'Por favor, Alan, registra esta venta.'};
        const {result}=renderHook(()=>useRecorridos([analisis,encargo,evento(3,'ia-2','ia-2','trabajo')],estaciones));
        act(()=>vi.advanceTimersByTime(5000));
        expect(result.current['ia-1'].fase).toBe('trabajo');
        expect(result.current['ia-2']).toBeUndefined();
        let pasos=0;
        while(result.current['ia-1']?.fase!=='visita'&&pasos++<200)act(()=>vi.advanceTimersByTime(250));
        expect(result.current['ia-2']).toBeUndefined();
        act(()=>vi.advanceTimersByTime(800));
        expect(result.current['ia-2'].fase).toBe('trabajo');
    });
    it('conserva los eventos iniciales cuando React comprueba el montaje en StrictMode',()=>{
        const e=evento(1,'ia-1','ia-1','trabajo');
        const {result}=renderHook(()=>useRecorridos([e],estaciones),{wrapper:({children})=><React.StrictMode>{children}</React.StrictMode>});
        act(()=>vi.advanceTimersByTime(50));expect(result.current['ia-1'].fase).toBe('trabajo');
        act(()=>vi.advanceTimersByTime(10000));expect(result.current).toEqual({});
    });
    it('una persona de paseo espera donde está al recibir una visita y vuelve con calma después',()=>{
        vi.spyOn(Math,'random').mockReturnValue(0);
        const casa={clave:'persona-5',x:700,y:100,quieto:false};
        const {result,rerender}=renderHook(({estacion})=>usePaseos([estacion],[{x:100,y:300}]),{initialProps:{estacion:casa}});
        act(()=>vi.advanceTimersByTime(22000));
        const punto=puntoEnMovimiento(result.current['persona-5']);
        rerender({estacion:{...casa,quieto:true}});
        expect(result.current['persona-5'].punto).toEqual(punto);
        expect(result.current['persona-5'].fase).toBe('pausa');
        act(()=>vi.advanceTimersByTime(5000));
        expect(result.current['persona-5'].punto).toEqual(punto);
        rerender({estacion:casa});
        expect(result.current['persona-5'].fase).toBe('vuelta');
    });
    it('mantiene un paso tranquilo y toma la posición real al interrumpir un paseo',()=>{
        expect(duracionPaso({x:0,y:0},{x:420,y:0})).toBe(10);
        expect(puntoEnMovimiento({anterior:{x:0,y:0},punto:{x:420,y:0},iniciado:1000,duracion:10},6000)).toEqual({x:210,y:0});
        const previo={'ia-1':{anterior:{x:600,y:100},punto:{x:700,y:100},iniciado:Date.now()-1000,duracion:2}};
        const {result}=renderHook(()=>useRecorridos([evento(1,'ia-1','persona-5')],estaciones,true,previo));
        expect(result.current['ia-1'].punto).toEqual({x:650,y:100});
    });
    it('anima trabajo en el puesto y luego entrega, sin un paseo ficticio al iniciar',()=>{
        const {result}=renderHook(()=>useRecorridos([evento(1,'ia-1','ia-1','trabajo'),evento(2,'ia-1','persona-5')],estaciones));
        act(()=>vi.advanceTimersByTime(50));
        expect(result.current['ia-1'].fase).toBe('trabajo');
        expect(result.current['ia-1'].punto).toMatchObject({x:700,y:100});
        act(()=>vi.advanceTimersByTime(8050));
        expect(result.current['ia-1'].fase).toBe('ida');
        act(()=>vi.advanceTimersByTime(180000));
        expect(result.current).toEqual({});
    });
    it('agentes distintos conservan sus recorridos cuando llega otro lote, sin duplicados',()=>{
        const uno=evento(1,'ia-1','persona-5'),dos=evento(2,'ia-2','persona-5');
        const {result,rerender}=renderHook(({eventos})=>useRecorridos(eventos,estaciones),{initialProps:{eventos:[uno]}});
        act(()=>vi.advanceTimersByTime(500));
        const punto=result.current['ia-1'].punto;
        rerender({eventos:[uno,dos]});
        expect(result.current['ia-1'].punto).toEqual(punto);
        expect(result.current['ia-2']).toBeDefined();
        act(()=>vi.advanceTimersByTime(180000));expect(result.current).toEqual({});
    });
    it('conserva un evento cuyo agente todavía está en otra página de puestos',()=>{
        const e=evento(1,'ia-2','persona-5');
        const {result,rerender}=renderHook(({lista})=>useRecorridos([e],lista),{initialProps:{lista:estaciones.slice(0,2)}});
        expect(result.current).toEqual({});
        rerender({lista:estaciones});expect(result.current['ia-2']).toBeDefined();
    });
});
describe('Ficha personalizada',()=>{
    it('conecta objetivo, horario, trabajo actual y orientación con su conversación real',()=>{
        const agente={id:1,nombre:'Analista',rol:'Ventas',areas:['ventas'],instrucciones:'Tu objetivo es mejorar el ticket promedio.\nUsa evidencia.'};
        const tarea={id:5,perfil:1,es_general:false,nombre:'Revisión comercial',activa:true,frecuencia:'diaria',hora:'09:00'};
        const info=actividadAgente({motor:{activo:true},automatizaciones:[tarea],en_curso:[{...tarea,estado:'ejecutando'}],iniciativas:[{id:8,perfil:1,texto:'¿Qué meta priorizamos?',conversacion:17}]},agente);
        const abrir=vi.fn();render(<ContenidoFicha agente={agente} info={info} zonaNombre="Comercial" trabajando onResultado={abrir} onProgramar={vi.fn()}/>);
        expect(screen.getByText('mejorar el ticket promedio.')).toBeInTheDocument();
        expect(screen.getByText('Cada día · 09:00')).toBeInTheDocument();
        expect(screen.getByText('Trabajando · Revisión comercial')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Responder al agente'}));
        expect(abrir).toHaveBeenCalledWith(expect.objectContaining({conversacion:17,iniciativa:true}));
        expect(objetivoAgente(agente)).toContain('ticket promedio');
        expect(visitasEstrategicas(agente,[{z:{id:3,ambiente:'creativo',nombre:'Creativo'},x:10,y:20,w:100,h:100}])[0].nombre).toBe('Creativo');
    });
});
