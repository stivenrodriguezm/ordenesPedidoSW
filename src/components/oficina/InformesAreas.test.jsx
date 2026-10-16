import React from 'react';
import {beforeEach,describe,expect,it,vi,afterEach} from 'vitest';
import {render,renderHook,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import API from '../../services/api';
import InformesAreas from './InformesAreas';
import {useRecorridos} from './recorridos';

vi.mock('../../services/api',()=>({default:{get:vi.fn(),post:vi.fn(),put:vi.fn()}}));
vi.mock('../chat/GraficoDatos',()=>({default:({grafico})=><div role="img" aria-label={grafico.titulo}>{grafico.valores.join(', ')}</div>}));
const coordinacion={puede_informar:true,puede_configurar:true,destinatarios:[{id:1,nombre:'Gerente de prueba'}],motor:{activo:true},programa:{revision:1,activa:true,hora_inicio:'09:50:00',hora_fin:'18:50:00',dias:[0,1,2,3,4,5,6],modelo:'',lideres:{}},informes:[{id:7,estado:'parcial',creado:'2026-10-09T14:50:00Z'}]};
const reporte={id:7,estado:'parcial',etapa:'Entregado a gerencia',creado:'2026-10-09T14:50:00Z',resumen:'Datos reales de la prueba aislada',datos:{capturado:'2026-10-09T14:50:00Z',cambios:{primera_lectura:true},coach:[{usuario:{id:5,nombre:'Persona de prueba',rol:'Vendedor'},pendientes:2,en_curso:1,bloqueadas:0,entregadas_hoy:3,atrasadas:1}],ventas:{total_pendientes:1,gestion_atrasada:1,entrega_atrasada:0,vendedores:[{usuario:{id:5,nombre:'Persona de prueba'},pendientes:1}],plan:[{venta:99,vendedores:[{nombre:'Persona de prueba'}],fecha_entrega:'2026-10-10',gestion_atrasada:true,acciones:[{responsable:'vendedor',accion:'Confirmar productos'}]}],plan_analista:[],nota:'Cada venta se cuenta una vez'},areas:[{zona:6,nombre:'Entrenamiento',lider:'Coach de prueba',estado:'sin_analisis',texto:'Evidencia disponible',error:'Modelo saturado'}]}};
function montar(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><InformesAreas coordinacion={coordinacion} zonas={[]} perfiles={[]} onCerrar={vi.fn()}/></QueryClientProvider>);}
beforeEach(()=>{vi.resetAllMocks();API.get.mockResolvedValue({data:reporte});API.post.mockResolvedValue({data:{id:8,estado:'pendiente'}});});
afterEach(()=>vi.useRealTimers());

describe('Informe compartido de áreas',()=>{
    it('conserva datos cuando falta el análisis y distingue trabajo de aprendizaje',async()=>{
        montar();await screen.findByText('Entregado con análisis pendientes');
        expect(screen.getByRole('img',{name:'Trabajo abierto por persona'})).toHaveTextContent('3');
        fireEvent.click(screen.getByRole('button',{name:'Coach y personas'}));
        expect(screen.getByText(/no representan una nota de aprendizaje/)).toBeInTheDocument();
        expect(screen.getByText('Persona de prueba')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Líderes de áreas'}));
        expect(screen.getByText('Modelo saturado')).toBeInTheDocument();
    });
    it('expande el plan de una venta y filtra por vendedor sin cambiar datos',async()=>{
        montar();await screen.findByText('Entregado con análisis pendientes');
        fireEvent.click(screen.getByRole('button',{name:'Plan comercial'}));
        fireEvent.click(screen.getByText('Venta #99'));
        expect(screen.getByText('Confirmar productos')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Buscar venta o vendedor'),{target:{value:'No existe'}});
        expect(screen.getByText('No hay ventas que coincidan.')).toBeInTheDocument();
        expect(API.put).not.toHaveBeenCalled();
    });
    it('encola con clave UUID y no ejecuta desde el navegador',async()=>{
        montar();await screen.findByText('Entregado con análisis pendientes');
        fireEvent.click(screen.getByRole('button',{name:'Pedir informe ahora'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/oficina/informes/',{clave:expect.stringMatching(/^[\da-f-]{36}$/)}));
    });
    it('explica y guarda el horario compartido editable',async()=>{
        API.put.mockResolvedValue({data:coordinacion});montar();await screen.findByText('Entregado con análisis pendientes');
        fireEvent.click(screen.getByRole('button',{name:'Programa',exact:true}));
        fireEvent.change(screen.getByLabelText('Último informe'),{target:{value:'17:50'}});
        fireEvent.click(screen.getByRole('button',{name:'Guardar programa'}));
        await waitFor(()=>expect(API.put).toHaveBeenCalledWith('/oficina/coordinacion/',expect.objectContaining({hora_inicio:'09:50',hora_fin:'17:50',revision:1})));
    });
    it('requiere confirmar el envío antes de activar el análisis de Gemini',async()=>{
        API.put.mockResolvedValue({data:coordinacion});montar();await screen.findByText('Entregado con análisis pendientes');
        fireEvent.click(screen.getByRole('button',{name:'Programa',exact:true}));
        fireEvent.change(screen.getByLabelText('Análisis de los líderes'),{target:{value:'automatico'}});
        const guardar=screen.getByRole('button',{name:'Guardar programa'});
        expect(guardar).toBeDisabled();expect(API.put).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('checkbox',{name:/Autorizo enviar esta evidencia/}));
        expect(guardar).toBeEnabled();fireEvent.click(guardar);
        await waitFor(()=>expect(API.put).toHaveBeenCalledWith('/oficina/coordinacion/',expect.objectContaining({modelo:'automatico',autorizar_envio:true})));
    });
});

describe('Recorridos por eventos',()=>{
    it('anima una interacción real una sola vez y limpia temporizadores al salir',()=>{
        vi.useFakeTimers();
        const evento={id:14,actor:'ia-general',destino:'ia-3',tipo:'consulta',texto:'Solicitando resultados',creado:new Date().toISOString()};
        const estaciones=[{clave:'ia-general',x:100,y:120},{clave:'ia-3',x:650,y:120}];
        const {result,rerender,unmount}=renderHook(({eventos})=>useRecorridos(eventos,estaciones,true),{initialProps:{eventos:[evento]}});
        expect(result.current['ia-general'].texto).toBe('Solicitando resultados');
        act(()=>vi.runAllTimers());expect(result.current).toEqual({});
        rerender({eventos:[{...evento}]});expect(result.current).toEqual({});
        unmount();expect(vi.getTimerCount()).toBe(0);
    });
    it('no reconstruye un recorrido antiguo ni crea una interacción inexistente',()=>{
        const {result}=renderHook(()=>useRecorridos([{id:1,creado:'2025-01-01T00:00:00Z',actor:'ia-general',destino:'ia-3'}],[],true));
        expect(result.current).toEqual({});
    });
});
