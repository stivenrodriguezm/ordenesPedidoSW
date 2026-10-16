import React from 'react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import AcademiaIA from './AcademiaIA';
import API from '../../services/api';

vi.mock('../../services/api',()=>({default:{get:vi.fn(),post:vi.fn(),delete:vi.fn()}}));
const coach={id:3,nombre:'Coach de asesores',activo:true,areas:['formacion']};
const curso={id:1,titulo:'Aprender a escuchar',estado:'listo',etapa:'listo',detalle:'Tu curso está listo',avance:100,audiencia:'Asesores',numero_modulos:2,con_videos:false,coach:coach.nombre,fuentes:[],eventos:[],resumen:'Un curso con práctica',solicitud:'Atención al cliente',modulos:[{titulo:'Escuchar al cliente',objetivo:'Comprender antes de proponer',contenido:'## Una buena conversación\nEscucha primero.',minutos:10,preguntas:[{pregunta:'¿Qué haces primero?',opciones:['Escuchar','Interrumpir'],correcta:0,explicacion:'Escuchar permite entender.'}]},{titulo:'Resolver',objetivo:'Ofrecer soluciones',contenido:'Resolver con claridad',preguntas:[]}]};
function montar(props={}){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><AcademiaIA open agentes={[coach]} onCerrar={vi.fn()} onConversar={vi.fn()} onProgramar={vi.fn()} puedeProgramar {...props}/></QueryClientProvider>);}
beforeEach(()=>{vi.resetAllMocks();API.get.mockImplementation(async url=>({data:url.endsWith('/cursos/')?{cursos:[],conexion:{estado:'desconectada',puede_conectar_chrome:true,conector_instalado:true,motor_activo:true}}:curso}));API.post.mockResolvedValue({data:curso});});
describe('Academia en la oficina',()=>{
    it('guarda la solicitud sin Google y un reintento de red usa la misma clave',async()=>{
        API.post.mockRejectedValueOnce(new Error('red'));
        montar();fireEvent.click(await screen.findByRole('button',{name:'Crear mi primer curso'}));
        fireEvent.change(screen.getByLabelText('Cuéntale tu idea al coach'),{target:{value:'Un curso de atención al cliente para mi equipo.'}});
        fireEvent.click(screen.getByRole('button',{name:'Crear mi curso'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar');
        const primera=API.post.mock.calls[0][1].clave;
        fireEvent.click(screen.getByRole('button',{name:'Crear mi curso'}));
        await screen.findByRole('heading',{name:'Aprender a escuchar'});
        expect(API.post.mock.calls[1][1].clave).toBe(primera);
        expect(API.post.mock.calls[1][1]).toMatchObject({perfil:3,numero_modulos:3,con_videos:true,urls:[]});
    });
    it('la conexión a Chrome requiere un paso de consentimiento visible',async()=>{
        montar();fireEvent.click(await screen.findByRole('button',{name:'Conectar Google'}));
        expect(API.post).not.toHaveBeenCalled();
        expect(screen.getByText(/guardará una sesión de Google/)).toBeInTheDocument();
        expect(screen.getByRole('button',{name:'Permitir conexión con Chrome'})).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Correo de Google'),{target:{value:'propietario@example.com'}});
        fireEvent.click(screen.getByRole('button',{name:'Permitir conexión con Chrome'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/academia/conexion/',{accion:'chrome',consentimiento:true,cuenta:'propietario@example.com'}));
    });
    it('programa el curso con instrucciones y el coach elegido',async()=>{
        const programar=vi.fn();montar({onProgramar:programar});
        fireEvent.click(await screen.findByRole('button',{name:'Crear mi primer curso'}));
        fireEvent.change(screen.getByLabelText('Cuéntale tu idea al coach'),{target:{value:'Capacitación para escuchar y resolver necesidades.'}});
        fireEvent.click(screen.getByRole('button',{name:'Programar para después'}));
        expect(programar).toHaveBeenCalledWith(expect.objectContaining({agente:coach,crear:true,instruccionesIniciales:expect.stringContaining('3 módulos. Genera un video por módulo.')}));
        expect(API.post).not.toHaveBeenCalled();
    });
    it('muestra lecciones reales y permite practicar con retroalimentación',async()=>{
        montar({cursoInicial:1});
        expect(await screen.findByRole('heading',{name:'Escuchar al cliente'})).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'A Escuchar'}));
        expect(screen.getByRole('status')).toHaveTextContent('¡Bien! Escuchar permite entender.');
        expect(screen.getByText(/1 de 1 respuestas correctas/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Siguiente módulo'}));
        expect(screen.getByRole('heading',{name:'Resolver'})).toBeInTheDocument();
    });
});
