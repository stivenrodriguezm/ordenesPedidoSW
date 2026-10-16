import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import API from '../services/api';
import ChatPage from './ChatPage';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const procesando = { id: 11, rol: 'asistente', texto: '', estado: 'procesando', consultas: ['Resumen de ventas'], error: '' };
const listo = { ...procesando, estado: 'listo', texto: '**Vamos bien.**\n\n| Mes | Ventas |\n|---|---|\n| Sep | $10 |', consultas: ['Resumen de ventas', 'Ventas por asesor'] };

beforeEach(() => {
    vi.resetAllMocks();
    let consultas = 0;
    API.get.mockImplementation(async (url) => {
        if (url === '/asistente/estado/') return { data: { configurado: true, modelo: 'gemini-3.7-flash', modelos: [{ id: 'gemini-3.7-flash' }, { id: 'gemini-3.6-flash' }] } };
        if (url === '/asistente/conversaciones/') return { data: [{ id: 5, titulo: 'Ventas de septiembre', actualizada: '2026-10-08T10:00:00Z' }] };
        if (url === '/asistente/mensajes/11/') { consultas += 1; return { data: consultas < 2 ? procesando : listo }; }
        if (url === '/asistente/conversaciones/5/') return { data: { id: 5, titulo: 'Ventas de septiembre', mensajes: [{ id: 1, rol: 'usuario', texto: '¿Cómo vamos?', estado: 'listo' }, { ...listo, id: 2 }] } };
        return { data: {} };
    });
    API.post.mockResolvedValue({ data: { conversacion: { id: 5, titulo: 'x' }, pregunta: { id: 10, rol: 'usuario', texto: '¿Cómo vamos?', estado: 'listo' }, respuesta: procesando } });
});

describe('Chat: asesor gerencial', () => {
    it('envía la pregunta, muestra qué está revisando y luego la respuesta con su tabla', async () => {
        render(<ChatPage />);
        fireEvent.click(await screen.findByRole('button', { name: '¿Cómo vamos este período comercial frente al anterior?' }));
        expect(API.post).toHaveBeenCalledWith('/asistente/preguntar/', { texto: '¿Cómo vamos este período comercial frente al anterior?', conversacion: null });
        expect(await screen.findByText('Revisando: Resumen de ventas')).toBeInTheDocument();
        expect(await screen.findByText('Vamos bien.', {}, { timeout: 5000 })).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText(/Resumen de ventas · Ventas por asesor/)).toBeInTheDocument();
    });

    it('si la IA general no está habilitada para el rol, empieza con su agente y no la ofrece', async () => {
        const coach = { id: 7, nombre: 'Coach comercial', rol: 'Te ayuda a vender', icono: 'personas', color: 'verde', areas: [], activo: true, documentos: [] };
        const antes = API.get.getMockImplementation();
        API.get.mockImplementation(async (url) => url === '/asistente/estado/' ? { data: { configurado: true, modelos: [], general: { visible: false } } }
            : url === '/asistente/perfiles/' ? { data: [coach] } : antes(url));
        API.post.mockResolvedValue({ data: { conversacion: { id: 9, titulo: 'x', perfil: { id: 7, nombre: 'Coach comercial' } }, pregunta: { id: 10, rol: 'usuario', texto: 'Hola', estado: 'listo' }, respuesta: { ...listo, id: 12 } } });
        render(<ChatPage />);
        expect(await screen.findByRole('heading', { name: 'Hola, soy Coach comercial' })).toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: /IA Lottus/ })).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Pregunta para el asesor'), { target: { value: 'Hola' } });
        fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/asistente/preguntar/', { texto: 'Hola', conversacion: null, perfil: 7 }));
    });

    it('abre una conversación guardada', async () => {
        render(<ChatPage />);
        fireEvent.click(await screen.findByRole('button', { name: 'Ventas de septiembre' }));
        expect(await screen.findByText('¿Cómo vamos?')).toBeInTheDocument();
        expect(screen.getByText('Vamos bien.')).toBeInTheDocument();
    });

    it('si el servidor rechaza la pregunta, conserva el texto y explica el motivo', async () => {
        API.post.mockRejectedValue({ response: { status: 429, data: { error: 'Llegaste al límite de 40 preguntas por hora. Intenta más tarde.' } } });
        render(<ChatPage />);
        const caja = await screen.findByLabelText('Pregunta para el asesor');
        fireEvent.change(caja, { target: { value: '¿Qué pasa con la caja?' } });
        fireEvent.keyDown(caja, { key: 'Enter' });
        expect(await screen.findByRole('alert')).toHaveTextContent('Llegaste al límite');
        await waitFor(() => expect(caja).toHaveValue('¿Qué pasa con la caja?'));
    });

    it('avisa cuando el asistente no está configurado', async () => {
        API.get.mockImplementation(async (url) => (url === '/asistente/estado/' ? { data: { configurado: false } } : { data: [] }));
        render(<ChatPage />);
        expect(await screen.findByText('El asistente no está disponible')).toBeInTheDocument();
    });
    it('permite cambiar de modelo tras un error y muestra el modelo que respondió', async () => {
        API.post.mockResolvedValueOnce({ data: { conversacion: { id: 5 }, pregunta: { id: 10, rol: 'usuario', texto: 'Hola', estado: 'listo' },
            respuesta: { ...procesando, estado: 'error', error: 'Gemini rechazó la solicitud por cuota (429).' } } });
        render(<ChatPage />);
        const selector = await screen.findByLabelText('Modelo de IA');
        await screen.findByRole('option', { name: 'gemini-3.6-flash' });
        fireEvent.change(selector, { target: { value: 'gemini-3.7-flash' } });
        fireEvent.change(screen.getByLabelText('Pregunta para el asesor'), { target: { value: 'Hola' } });
        fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('cuota (429)');
        fireEvent.change(selector, { target: { value: 'gemini-3.6-flash' } });
        API.post.mockResolvedValueOnce({ data: { conversacion: { id: 5 }, pregunta: { id: 12, rol: 'usuario', texto: 'Hola', estado: 'listo' },
            respuesta: { ...listo, id: 13, modelo: 'gemini-3.6-flash' } } });
        fireEvent.click(screen.getByRole('button', { name: 'Volver a preguntar' }));
        await screen.findByText('Vamos bien.');
        expect(API.post).toHaveBeenLastCalledWith('/asistente/preguntar/', { texto: 'Hola', conversacion: 5, modelo: 'gemini-3.6-flash' });
        expect(document.querySelector('.chat-modelo-usado')).toHaveTextContent('gemini-3.6-flash');
    });

    it('detiene el sondeo tras fallos de red y permite consultar sin duplicar la pregunta', async () => {
        const anterior = API.get.getMockImplementation();
        let recuperada = false;
        API.get.mockImplementation(url => url === '/asistente/mensajes/11/'
            ? (recuperada ? Promise.resolve({ data: listo }) : Promise.reject(new Error('Sin red')))
            : anterior(url));
        render(<ChatPage />);
        fireEvent.click(await screen.findByRole('button', { name: '¿Cómo vamos este período comercial frente al anterior?' }));
        const consultar = await screen.findByRole('button', { name: 'Consultar respuesta' }, { timeout: 6000 });
        expect(screen.queryByText('Revisando: Resumen de ventas')).not.toBeInTheDocument();
        recuperada = true;
        fireEvent.click(consultar);
        await screen.findByText('Vamos bien.', {}, { timeout: 2500 });
        expect(API.post).toHaveBeenCalledTimes(1);
    }, 9000);

    it('permite elegir un perfil de IA para la conversación nueva y ver lo aprendido', async () => {
        const anterior = API.get.getMockImplementation();
        const perfil = { id: 4, nombre: 'Cobranza', rol: 'Prioriza los cobros', icono: 'dinero', color: 'naranja', areas: ['cobros'], activo: true, documentos: [] };
        API.get.mockImplementation(async (url, opciones) => {
            if (url === '/asistente/perfiles/') return { data: [perfil, { ...perfil, id: 5, nombre: 'Pausado', activo: false }] };
            if (url === '/asistente/aprendizajes/') return { data: opciones?.params?.perfil === 4 ? [{ id: 1, tipo: 'nota', texto: 'Cifras en millones', activo: true, creado: '2026-10-08T10:00:00Z', pregunta: '' }] : [] };
            return anterior(url);
        });
        API.post.mockResolvedValueOnce({ data: { conversacion: { id: 7, titulo: 'x', perfil }, pregunta: { id: 10, rol: 'usuario', texto: 'Hola', estado: 'listo' }, respuesta: { ...listo, id: 13 } } });
        render(<ChatPage />);
        fireEvent.click(await screen.findByRole('radio', { name: /Cobranza/ }));
        expect(screen.queryByRole('radio', { name: /Pausado/ })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Hola, soy Cobranza' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Lo aprendido/ }));
        expect(await screen.findByText('Cifras en millones')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
        fireEvent.click(screen.getByRole('button', { name: '¿Cuánto tenemos por cobrar y dónde está el mayor riesgo?' }));
        expect(API.post).toHaveBeenCalledWith('/asistente/preguntar/', { texto: '¿Cuánto tenemos por cobrar y dónde está el mayor riesgo?', conversacion: null, perfil: 4 });
        expect(await screen.findByRole('button', { name: 'Me gustó' })).toBeInTheDocument();
    });
});

describe('Chat por agente desde la oficina', () => {
    const perfil = {id:4,nombre:'Analista comercial',rol:'Revisa ventas',icono:'grafica',color:'verde',activo:true,areas:['ventas']};
    it('filtra el historial en el servidor y envía al perfil de la ruta',async()=>{
        const anterior=API.get.getMockImplementation();
        API.get.mockImplementation(async(url,opciones)=>{
            if(url==='/asistente/perfiles/')return {data:[perfil]};
            if(url==='/asistente/conversaciones/')return {data:opciones?.params?.perfil===4?[{id:8,titulo:'Propia',perfil}]:[{id:9,titulo:'Otro agente'}]};
            return anterior(url);
        });
        API.post.mockResolvedValue({data:{conversacion:{id:8,perfil},pregunta:{id:20,rol:'usuario',texto:'Hola',estado:'listo'},respuesta:{...listo,id:21}}});
        render(<ChatPage perfilInicial={4}/>);
        await screen.findByRole('heading',{name:'Hola, soy Analista comercial'});
        expect(API.get).toHaveBeenCalledWith('/asistente/conversaciones/',{params:{sin_ejecuciones:'1',perfil:4}});
        expect(screen.queryByText('Otro agente')).not.toBeInTheDocument();
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Pregunta para el asesor'),{target:{value:'Hola'}});
        fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/preguntar/',{texto:'Hola',conversacion:null,perfil:4}));
    });
    it('puede seguir conversando después de recibir el resumen de un perfil activo',async()=>{
        const anterior=API.get.getMockImplementation();
        API.get.mockImplementation(async(url,opciones)=>url==='/asistente/perfiles/'?{data:[perfil]}:anterior(url,opciones));
        // El resumen histórico no incluía activo; se combina con el perfil cargado.
        const resumen={id:4,nombre:perfil.nombre,rol:perfil.rol,icono:perfil.icono,color:perfil.color};
        API.post.mockResolvedValue({data:{conversacion:{id:8,perfil:resumen},pregunta:{id:20,rol:'usuario',texto:'Hola',estado:'listo'},respuesta:{...listo,id:21}}});
        render(<ChatPage perfilInicial={4}/>);
        await screen.findByRole('heading',{name:'Hola, soy Analista comercial'});
        fireEvent.change(screen.getByLabelText('Pregunta para el asesor'),{target:{value:'Hola'}});
        fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
        await screen.findByText('Vamos bien.');
        expect(screen.queryByText(/Este agente está pausado/)).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Pregunta para el asesor'),{target:{value:'Otra pregunta'}});
        expect(screen.getByRole('button',{name:'Enviar'})).toBeEnabled();
        fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
        await waitFor(()=>expect(API.post).toHaveBeenLastCalledWith('/asistente/preguntar/',{texto:'Otra pregunta',conversacion:8}));
    });
    it('espera a cargar el historial antes de enviar para no crear otra conversación por accidente',async()=>{
        const anterior=API.get.getMockImplementation();
        let resolver;
        API.get.mockImplementation(async(url,opciones)=>{
            if(url==='/asistente/perfiles/')return {data:[perfil]};
            if(url==='/asistente/conversaciones/8/')return new Promise(r=>{resolver=r;});
            return anterior(url,opciones);
        });
        render(<ChatPage perfilInicial={4} conversacionInicial={8}/>);
        await screen.findByText('Abriendo conversación…');
        const pregunta=screen.getByLabelText('Pregunta para el asesor');
        fireEvent.change(pregunta,{target:{value:'Validar venta'}});
        expect(screen.getByRole('button',{name:'Enviar'})).toBeDisabled();
        fireEvent.keyDown(pregunta,{key:'Enter'});
        expect(API.post).not.toHaveBeenCalled();
        await waitFor(()=>expect(resolver).toBeTypeOf('function'));
        resolver({data:{id:8,perfil,mensajes:[]}});
        await waitFor(()=>expect(screen.getByRole('button',{name:'Enviar'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/preguntar/',{texto:'Validar venta',conversacion:8}));
    });
    it('abre el historial pedido y rechaza una conversación de otro perfil',async()=>{
        const anterior=API.get.getMockImplementation();
        API.get.mockImplementation(async(url,opciones)=>url==='/asistente/perfiles/'?{data:[perfil]}:anterior(url,opciones));
        render(<ChatPage perfilInicial={4} conversacionInicial={5}/>);
        expect(await screen.findByRole('alert')).toHaveTextContent('pertenece a otro agente');
        expect(screen.queryByText('Vamos bien.')).not.toBeInTheDocument();
    });
    it('si el agente desaparece, no envía silenciosamente una pregunta al general',async()=>{
        const anterior=API.get.getMockImplementation();
        API.get.mockImplementation(async(url)=>url==='/asistente/perfiles/'?{data:[]}:anterior(url));
        render(<ChatPage perfilInicial={4}/>);
        expect(await screen.findByRole('alert')).toHaveTextContent('ya no está disponible');
        expect(API.post).not.toHaveBeenCalled();
    });

    it('muestra la conversación entre IA Lottus y Alan en «Equipo IA», con su ejecución', async () => {
        const alan = { id: 5, nombre: 'Alan', rol: 'Ejecuta operaciones', icono: 'robot', color: 'turquesa', ejecutor: true };
        const participantes = [{ clave: 'ia-general', nombre: 'IA Lottus', perfil: null }, { clave: 'ia-5', nombre: 'Alan', perfil: alan }];
        const trabajo = { id: 31, estado: 'ejecutando', pasos_guardados: 0, solicitud: 'Cambia la fecha', agente: { id: 5, nombre: 'Alan' } };
        const antes = API.get.getMockImplementation();
        API.get.mockImplementation(async (url, opciones) => {
            if (url === '/asistente/equipo/hilos/') return { data: { hilos: [{ clave: 'ia-general~ia-5', participantes, total: 2, activo: true,
                ultimo: { id: 2, de: 'ia-5', nombre: 'Alan', texto: '¡Entendido! Empiezo ahora mismo.', tipo: 'avance', creado: '2026-10-14T15:00:00Z' } }] } };
            if (url === '/asistente/equipo/hilos/ia-general~ia-5/') return { data: { clave: 'ia-general~ia-5', participantes, mensajes: [
                { id: 1, de: 'ia-general', para: 'ia-5', nombre: 'IA Lottus', tipo: 'solicitud', texto: 'Por favor, Alan: cambia la fecha de entrega.', creado: '2026-10-14T15:00:00Z', trabajo },
                { id: 2, de: 'ia-5', para: 'ia-general', nombre: 'Alan', tipo: 'avance', texto: '¡Entendido! Empiezo ahora mismo.', creado: '2026-10-14T15:00:05Z', trabajo }] } };
            return antes(url, opciones);
        });
        render(<ChatPage />);
        fireEvent.click(await screen.findByRole('tab', { name: /Equipo IA/ }));
        expect(await screen.findByRole('heading', { name: 'IA Lottus y Alan' })).toBeInTheDocument();
        expect(screen.getByText('Por favor, Alan: cambia la fecha de entrega.')).toBeInTheDocument();
        expect(screen.getByText('Alan está trabajando en la tarea…')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Ejecución #31 · Trabajando/ })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Equipo IA/ })).toHaveTextContent('1');
        // Volver a «Mis chats» muestra de nuevo las conversaciones del usuario.
        fireEvent.click(screen.getByRole('tab', { name: /Mis chats/ }));
        expect(await screen.findByText('Ventas de septiembre')).toBeInTheDocument();
    });
});
