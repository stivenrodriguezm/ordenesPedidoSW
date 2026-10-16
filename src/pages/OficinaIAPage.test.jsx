import React from 'react';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import API from '../services/api';
import OficinaIAPage from './OficinaIAPage';
import { AppContext } from '../AppContext';
import ChatLateralProvider from '../components/chat/ChatLateralProvider';

vi.mock('../services/api',()=>({default:{get:vi.fn(),post:vi.fn(),patch:vi.fn()}}));
const zonas=[{id:1,nombre:'Estudio',ambiente:'estudio',descripcion:''},{id:2,nombre:'Comercial',ambiente:'showroom',descripcion:''}];
const perfil={id:4,nombre:'Analista comercial',rol:'Valida tus ventas',icono:'grafica',color:'verde',activo:true,zona:2};
let gestionar;
function Ruta(){const l=useLocation();return <><output data-testid="ruta">{l.pathname}{l.search}</output><output data-testid="borrador-ruta">{l.state?.borrador}</output></>;}
function montar(){const cache=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});return render(<AppContext.Provider value={{usuario:{role:'administrador'}}}><QueryClientProvider client={cache}><MemoryRouter initialEntries={['/IA']}><ChatLateralProvider><OficinaIAPage/><Ruta/></ChatLateralProvider></MemoryRouter></QueryClientProvider></AppContext.Provider>);}
beforeEach(()=>{
    vi.resetAllMocks(); gestionar=true;
    API.get.mockImplementation(async url=>({data:url==='/oficina/estado/'?{yo:{id:1,nombre:'Responsable'},responsable:null,puede_gestionar:gestionar,participa:false,puede_usar_ia:true,personas:[],zonas,mis_pendientes:0,mensajes_sin_leer:0}:url==='/asistente/estado/'?{configurado:true,puede_gestionar_perfiles:gestionar}:url==='/asistente/perfiles/'?[perfil,{...perfil,id:9,nombre:'Pausado',activo:false}]:url==='/asistente/zonas/'?zonas:url==='/asistente/oficina-actividad/'?{motor:{activo:true},automatizaciones:[],pendientes:[],en_curso:[],puede_programar:true}:url==='/asistente/conversaciones/15/'?{perfil,mensajes:[]}:[{id:15,titulo:'Revisión comercial',perfil,activa:true,actualizada:'2026-10-08T12:00:00Z'}]}));
    API.patch.mockResolvedValue({data:perfil}); API.post.mockResolvedValue({data:{id:3,nombre:'Taller'}});
});
describe('Oficina virtual LOTTUS',()=>{
    it('representa las seis áreas en el mismo espacio y ofrece actividad y programación por agente',async()=>{
        const anterior=API.get.getMockImplementation();
        const ampliadas=['Gerencia','Oficina','Área comercial','Entrenamiento','Desarrollo creativo','Zona social'].map((nombre,i)=>({id:i+1,nombre,ambiente:['gerencia','oficina','showroom','entrenamiento','creativo','social'][i]}));
        API.get.mockImplementation(async url=>url==='/asistente/zonas/'?{data:ampliadas}:url==='/asistente/oficina-actividad/'?{data:{motor:{activo:true},automatizaciones:[],pendientes:[],en_curso:[],puede_programar:true}}:anterior(url));
        const {container}=montar();await screen.findByRole('button',{name:'Conversar con Analista comercial'});
        const areas=[...container.querySelectorAll('[data-superficie]')];
        const comercial=areas.find(a=>a.dataset.area==='Área comercial');
        for(const otra of areas.filter(a=>a!==comercial))expect(Number(comercial.dataset.superficie)/Number(otra.dataset.superficie)).toBeCloseTo(2);
        expect(comercial.querySelectorAll('[data-mueble=escritorio]')).toHaveLength(7);
        expect(areas.find(a=>a.dataset.area==='Gerencia').querySelectorAll('[data-mueble=escritorio]')).toHaveLength(3);
        const social=areas.find(a=>a.dataset.area==='Zona social');
        expect(social.querySelectorAll('[data-mueble=cafetera]')).toHaveLength(1);
        expect(social.querySelectorAll('[data-mueble=sillon-descanso]')).toHaveLength(3);
        expect(social.querySelector('[data-mueble=sofa]').dataset.plazas).toBe('3');
        expect(container.querySelector('.of-planta').getAttribute('viewBox')).toBe('0 0 1650 710');
        expect(container.querySelectorAll('[data-pasillo]')).toHaveLength(5);
        for(const p of container.querySelectorAll('[data-pasillo]'))expect(Number(p.dataset.ancho)).toBeGreaterThanOrEqual(42);
        expect(screen.getByText('2 agentes · 6 áreas')).toBeInTheDocument();
        expect(screen.queryByRole('button',{name:'Más zonas'})).not.toBeInTheDocument();
        expect(screen.getByRole('button',{name:'Acercar mapa'})).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Actividad de Analista comercial'}));
        const ficha=screen.getByRole('dialog');expect(ficha).toHaveTextContent('Sin tareas programadas');
        fireEvent.click(within(ficha).getByRole('button',{name:'Programar tarea'}));
        expect(screen.getByRole('dialog',{name:'Crear automatización'})).toBeInTheDocument();
        expect(screen.getByLabelText('Agente')).toHaveValue('4');
    });
    it('ubica los perfiles existentes y abre su historial, sin mostrar agentes pausados',async()=>{
        montar();
        fireEvent.click(await screen.findByRole('button',{name:'Conversar con Analista comercial'}));
        expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/IA$/);
        const chat=await screen.findByRole('region',{name:'Conversación en la oficina'});
        expect(await within(chat).findByRole('region',{name:'Chat con Analista comercial'})).toBeInTheDocument();
        // Abrir un agente empieza en su página inicial (el historial queda a un clic).
        expect(API.get).not.toHaveBeenCalledWith('/asistente/conversaciones/15/');
        fireEvent.click(within(chat).getByRole('button',{name:'Abrir chat a pantalla completa'}));
        expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/IA\/agentes\/4$/);
        expect(screen.queryByText('Pausado')).not.toBeInTheDocument();
        expect(screen.getByText('Respondiendo')).toBeInTheDocument();
    });
    it('ofrece el chat general y la vista equipo con búsqueda independiente del plano',async()=>{
        montar(); await screen.findByRole('button',{name:'Conversar con Analista comercial'});
        expect(screen.getByRole('link',{name:'Chat general'})).toHaveAttribute('href','/IA/general');
        fireEvent.click(screen.getByRole('button',{name:'Equipo'}));
        expect(screen.queryByLabelText('Oficina virtual de agentes LOTTUS')).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Buscar en la oficina'),{target:{value:'analista'}});
        expect(screen.getByRole('heading',{name:'Analista comercial'})).toBeInTheDocument();
        expect(screen.queryByRole('heading',{name:'IA Lottus'})).not.toBeInTheDocument();
    });
    it('persiste cambios de zona solo para quien gestiona',async()=>{
        montar(); const selector=await screen.findByLabelText('Zona de Analista comercial');
        fireEvent.change(selector,{target:{value:'1'}});
        await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/asistente/perfiles/4/',{zona:1}));
        expect(API.post).not.toHaveBeenCalled();
    });
    it('quien usa IA sin gestionar no ve acciones de edición o creación',async()=>{
        gestionar=false; montar(); await screen.findByRole('button',{name:'Conversar con Analista comercial'});
        expect(screen.queryByRole('link',{name:'Gestionar agentes'})).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Zona de Analista comercial')).not.toBeInTheDocument();
        expect(screen.queryByRole('button',{name:'Crear agente'})).not.toBeInTheDocument();
        expect(screen.getByRole('link',{name:'Chat general'})).toBeInTheDocument();
    });
    it('guarda una zona desde un diálogo y conserva el contexto de la oficina',async()=>{
        montar(); fireEvent.click(await screen.findByRole('button',{name:'Nueva zona'}));
        const dialogo=screen.getByRole('dialog');
        fireEvent.change(within(dialogo).getByLabelText('Nombre'),{target:{value:'Taller'}});
        fireEvent.click(within(dialogo).getByRole('button',{name:'Guardar zona'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/zonas/',expect.objectContaining({nombre:'Taller',ambiente:'estudio'})));
        await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
    it('permite recorrer todos los puestos cuando una zona supera los siete agentes comerciales',async()=>{
        const anterior=API.get.getMockImplementation();
        API.get.mockImplementation(async url=>url==='/asistente/perfiles/'?{data:[perfil,...Array.from({length:6},(_,i)=>({...perfil,id:20+i,nombre:`Vendedor ${i+1}`})),{...perfil,id:6,nombre:'Compras'}]}:anterior(url));
        montar(); await screen.findByRole('button',{name:'Conversar con Analista comercial'});
        expect(screen.queryByRole('button',{name:'Conversar con Compras'})).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Más puestos'}));
        expect(screen.getByRole('button',{name:'Conversar con Compras'})).toBeInTheDocument();
        expect(screen.getByRole('button',{name:'Conversar con IA Lottus'})).toBeInTheDocument();
    });
    it('mantiene los borradores al cambiar de agente, los reinicia al cerrar con X y los lleva al ampliar',async()=>{
        montar();fireEvent.click(await screen.findByRole('button',{name:'Conversar con Analista comercial'}));
        const chat=screen.getByRole('region',{name:'Conversación en la oficina'});
        const pregunta=await within(chat).findByRole('textbox',{name:'Pregunta para el asesor'});
        fireEvent.change(pregunta,{target:{value:'Validar mi venta física'}});
        fireEvent.change(within(chat).getByLabelText('Elegir agente para conversar'),{target:{value:'general'}});
        expect(await within(chat).findByRole('textbox',{name:'Pregunta para el asesor'})).toHaveValue('');
        fireEvent.change(within(chat).getByLabelText('Elegir agente para conversar'),{target:{value:'4'}});
        expect(await within(chat).findByRole('textbox',{name:'Pregunta para el asesor'})).toHaveValue('Validar mi venta física');
        fireEvent.click(within(chat).getByRole('button',{name:'Cerrar chat y volver a la oficina'}));
        await waitFor(()=>expect(screen.queryByRole('region',{name:'Conversación en la oficina'})).not.toBeInTheDocument());
        fireEvent.click(screen.getByRole('button',{name:'Conversar con Analista comercial'}));
        const reabierto=screen.getByRole('region',{name:'Conversación en la oficina'});
        const nueva=await within(reabierto).findByRole('textbox',{name:'Pregunta para el asesor'});
        expect(nueva).toHaveValue('');  // cerrar con X vuelve a la página inicial
        fireEvent.change(nueva,{target:{value:'Validar mi venta física'}});
        fireEvent.click(within(reabierto).getByRole('button',{name:'Abrir chat a pantalla completa'}));
        expect(screen.getByTestId('borrador-ruta')).toHaveTextContent('Validar mi venta física');
        expect(API.post).not.toHaveBeenCalled();
    });
    it('abre el historial general en la oficina y cierra con Escape',async()=>{
        montar();fireEvent.click(await screen.findByRole('link',{name:'Chat general'}));
        const chat=screen.getByRole('region',{name:'Conversación en la oficina'});
        expect(screen.getByLabelText('Oficina virtual de agentes LOTTUS')).toBeInTheDocument();
        expect(await within(chat).findByRole('region',{name:/Chat con/})).toBeInTheDocument();
        fireEvent.click(within(chat).getByRole('button',{name:'Ver conversaciones'}));
        expect(within(chat).getByRole('complementary',{name:'Conversaciones'})).toHaveTextContent('Revisión comercial');
        fireEvent.click(within(chat).getByRole('button',{name:'Cerrar historial'}));
        fireEvent.keyDown(document,{key:'Escape'});
        await waitFor(()=>expect(screen.queryByRole('region',{name:'Conversación en la oficina'})).not.toBeInTheDocument());
        expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/IA$/);
    });
    it('un error de carga permite reintentar y no presenta una oficina ficticia',async()=>{
        API.get.mockRejectedValue(new Error('Sin conexión')); montar();
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar');
        expect(screen.queryByRole('button',{name:'Conversar con IA Lottus'})).not.toBeInTheDocument();
        expect(screen.getByRole('button',{name:'Reintentar'})).toBeInTheDocument();
    });
});
