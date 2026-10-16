import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import API from '../../services/api';
import PanelColaboracion from './PanelColaboracion';
import {EditorEquipo} from './EquipoHumano';
import EscenaOficina from './EscenaOficina';
import OficinaIAPage from '../../pages/OficinaIAPage';
import { AppContext } from '../../AppContext';
import ChatLateralProvider from '../chat/ChatLateralProvider';

vi.mock('../../services/api',()=>({default:{get:vi.fn(),post:vi.fn(),patch:vi.fn(),put:vi.fn()}}));
const ana={id:4,nombre:'Ana Prueba',rol:'Vendedor',zona:2,puesto:1,estado:'ocupado',nota_estado:'Con un cliente',en_oficina:true,pendientes:2,destacado:{id:8,texto:'Necesito confirmar la tela'}};
const luis={...ana,id:5,nombre:'Luis Prueba',puesto:2,pendientes:null,destacado:null};
const yo={id:1,nombre:'Responsable Prueba',rol:'Administrador'};
const zonas=[{id:1,nombre:'Gerencia',ambiente:'gerencia'},{id:2,nombre:'Área comercial',ambiente:'showroom'}];
const estado={yo,responsable:yo,puede_gestionar:true,participa:true,puede_usar_ia:true,personas:[ana,luis],zonas,revision:1,mis_pendientes:0,mensajes_sin_leer:0};
const t={id:10,tipo:'solicitud',creador:ana,responsable:yo,titulo:'Cambiar referencia',descripcion:'Necesito una actualización',prioridad:'alta',estado:'pendiente',fecha_limite:null,venta:null,revision:3,comentarios:[],actualizado:'2026-10-09T15:00:00Z'};
const borradores=()=>({current:{}});
function montar(c){return render(<AppContext.Provider value={{usuario:{role:'administrador'}}}><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><MemoryRouter><ChatLateralProvider>{c}</ChatLateralProvider></MemoryRouter></QueryClientProvider></AppContext.Provider>);}
beforeEach(()=>{vi.resetAllMocks();API.get.mockImplementation(async url=>({data:url==='/oficina/estado/'?estado:url==='/oficina/equipo/'?{revision:1,personas:[{...ana,seleccionado:false,zona:null,puesto:null},{...luis,seleccionado:false,zona:null,puesto:null}]}:url.startsWith('/oficina/trabajos/10/')?t:url.startsWith('/oficina/trabajos/')?{resultados:[t],hay_mas:false}:url.includes('/ventas/')?{disponible:false}:url==='/asistente/estado/'?{configurado:true,puede_gestionar_perfiles:true}:url==='/asistente/zonas/'?zonas:url==='/asistente/oficina-actividad/'?{automatizaciones:[],pendientes:[],en_curso:[]}:url==='/asistente/perfiles/'?[{id:4,nombre:'Analista IA',rol:'Ventas',zona:2,activo:true}]:url==='/asistente/conversaciones/'?[]:{resultados:[],hay_mas:false}}));API.post.mockResolvedValue({data:t});API.patch.mockResolvedValue({data:t});API.put.mockResolvedValue({data:{revision:2}});});
describe('Personas y colaboración en la oficina',()=>{
    it('selecciona cuentas existentes sin crear usuarios y envía solo selección y puestos',async()=>{
        const cerrar=vi.fn();montar(<EditorEquipo zonas={zonas} onCerrar={cerrar}/>);
        fireEvent.click(await screen.findByRole('checkbox',{name:/Ana Prueba/}));
        fireEvent.change(screen.getByLabelText('Zona de la persona Ana Prueba'),{target:{value:'2'}});
        fireEvent.change(screen.getByLabelText('Puesto de Ana Prueba'),{target:{value:'1'}});
        fireEvent.click(screen.getByRole('button',{name:'Guardar equipo'}));
        await waitFor(()=>expect(API.put).toHaveBeenCalledWith('/oficina/equipo/',{revision:1,personas:[{usuario:4,zona:2,puesto:1}]}));
        expect(API.post).not.toHaveBeenCalled();await waitFor(()=>expect(cerrar).toHaveBeenCalled());
    });
    it('diferencia humanos y agentes aunque sus identificadores coincidan, con aviso y ficha',()=>{
        const abrir=vi.fn();montar(<EscenaOficina zonas={zonas} agentes={[{id:4,nombre:'Analista IA',zona:2}, {...ana,esPersona:true}]} actividad={new Set([4])} onPersona={abrir} onAgente={vi.fn()} onZona={vi.fn()}/>);
        expect(screen.getByRole('button',{name:'Conversar con Analista IA'})).toHaveClass('is-activa');
        const humana=screen.getByRole('button',{name:'Abrir oficina de Ana Prueba'});expect(humana).not.toHaveClass('is-activa');
        fireEvent.mouseEnter(humana.parentElement);expect(screen.getByRole('region',{name:'Actividad de Ana Prueba'})).toHaveTextContent('Con un cliente');
        expect(screen.getByRole('region',{name:'Actividad de Ana Prueba'})).not.toHaveTextContent('Preparando');
        fireEvent.click(screen.getByRole('button',{name:'Aviso destacado de Ana Prueba'}));expect(abrir).toHaveBeenCalledWith(expect.objectContaining({id:4,esPersona:true}));
    });
    it('una persona invitada sin permiso de IA accede a su oficina sin consultar APIs de IA',async()=>{
        const antes=API.get.getMockImplementation();API.get.mockImplementation(url=>url==='/oficina/estado/'?Promise.resolve({data:{...estado,yo:ana,puede_usar_ia:false,puede_gestionar:false}}):antes(url));
        montar(<OficinaIAPage/>);await screen.findByRole('region',{name:'Personas de la oficina'});
        expect(API.get.mock.calls.some(([url])=>url.startsWith('/asistente/'))).toBe(false);
        expect(screen.queryByRole('link',{name:'Chat general'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button',{name:'Elegir personas de la oficina'})).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Bandeja'}));expect(screen.getByRole('complementary',{name:'Bandeja de la oficina'})).toBeInTheDocument();
    });
    it('envía mensajes privados sin destacado y conserva el borrador al volver',async()=>{
        const drafts=borradores(),cerrar=vi.fn();const r=montar(<PanelColaboracion estado={estado} persona={ana} onCerrar={cerrar} onCambiar={vi.fn()} borradores={drafts}/>);
        const entrada=await screen.findByRole('textbox',{name:'Mensaje para Ana Prueba'});
        expect(screen.queryByText('Destacar en la oficina')).not.toBeInTheDocument();
        fireEvent.change(entrada,{target:{value:'Texto pendiente'}});r.unmount();
        montar(<PanelColaboracion estado={estado} persona={ana} onCerrar={cerrar} onCambiar={vi.fn()} borradores={drafts}/>);
        expect(screen.getByRole('textbox',{name:'Mensaje para Ana Prueba'})).toHaveValue('Texto pendiente');
        fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/oficina/mensajes/',{texto:'Texto pendiente',destinatario:4,destacar:false,horas:4}));
    });
    it('publica un aviso al equipo con caducidad explícita y trata el texto como texto',async()=>{
        const antes=API.get.getMockImplementation();API.get.mockImplementation(url=>url.startsWith('/oficina/mensajes/')?Promise.resolve({data:{resultados:[{id:8,autor:ana,destinatario:null,texto:'<script>no ejecutar</script>',creado:'2026-10-09T15:00:00Z'}],hay_mas:false}}):antes(url));
        montar(<PanelColaboracion estado={estado} onCerrar={vi.fn()} onCambiar={vi.fn()} borradores={borradores()}/>);
        fireEvent.click(await screen.findByRole('button',{name:/Todo el equipo/}));await screen.findByText('<script>no ejecutar</script>');
        fireEvent.change(screen.getByRole('textbox',{name:'Mensaje para el equipo'}),{target:{value:'Aviso de prueba aislada'}});
        fireEvent.click(screen.getByRole('checkbox',{name:'Destacar en la oficina'}));fireEvent.change(screen.getByLabelText('Duración del destacado'),{target:{value:'1'}});
        fireEvent.click(screen.getByRole('button',{name:'Enviar'}));await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/oficina/mensajes/',{texto:'Aviso de prueba aislada',destinatario:null,destacar:true,horas:1}));
    });
    it('la solicitud de un miembro se dirige al responsable y no permite asignar tareas ajenas',async()=>{
        montar(<PanelColaboracion estado={{...estado,yo:ana,puede_gestionar:false}} onCerrar={vi.fn()} onCambiar={vi.fn()} borradores={borradores()}/>);
        fireEvent.click(screen.getByRole('button',{name:'Trabajos'}));fireEvent.click(screen.getByRole('button',{name:'Pedir actualización'}));const modal=screen.getByRole('dialog',{name:'Pedir una actualización'});
        expect(modal).toHaveTextContent('Responsable Prueba');expect(within(modal).queryByRole('combobox',{name:'Responsable'})).not.toBeInTheDocument();
        fireEvent.change(within(modal).getByLabelText('Título'),{target:{value:'Actualizar mi venta'}});fireEvent.click(within(modal).getByRole('button',{name:'Enviar solicitud'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/oficina/trabajos/',expect.objectContaining({tipo:'solicitud',responsable:1,titulo:'Actualizar mi venta'})));
    });
    it('guarda estados con revisión y conserva el conflicto visible sin sobrescribir avances',async()=>{
        API.patch.mockRejectedValue({response:{status:409,data:{error:'El trabajo cambió. Recárgalo antes de guardar.'}}});
        montar(<PanelColaboracion estado={estado} onCerrar={vi.fn()} onCambiar={vi.fn()} borradores={borradores()}/>);
        fireEvent.click(screen.getByRole('button',{name:'Trabajos'}));fireEvent.click(await screen.findByRole('button',{name:/Cambiar referencia/}));
        fireEvent.change(await screen.findByLabelText('Estado del trabajo'),{target:{value:'en_curso'}});
        await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/oficina/trabajos/10/',{revision:3,estado:'en_curso'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('El trabajo cambió');
    });
    it('marca lectura únicamente para mensajes privados recibidos',async()=>{
        const antes=API.get.getMockImplementation();API.get.mockImplementation(url=>url.startsWith('/oficina/mensajes/')?Promise.resolve({data:{resultados:[{id:7,autor:ana,destinatario:1,texto:'Recibido',creado:'2026-10-09T15:00:00Z',leido_en:null},{id:8,autor:yo,destinatario:4,texto:'Enviado',creado:'2026-10-09T15:01:00Z',leido_en:null}],hay_mas:false}}):antes(url));
        montar(<PanelColaboracion estado={estado} persona={ana} onCerrar={vi.fn()} onCambiar={vi.fn()} borradores={borradores()}/>);
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/oficina/mensajes/leer/',{ids:[7]}));
    });
    it('no consulta el resumen comercial ajeno y muestra la restricción',()=>{
        montar(<PanelColaboracion estado={{...estado,yo:luis,puede_gestionar:false}} persona={ana} onCerrar={vi.fn()} onCambiar={vi.fn()} borradores={borradores()}/>);
        fireEvent.click(screen.getByRole('button',{name:'Ventas'}));expect(screen.getByText(/solo está disponible para el responsable/)).toBeInTheDocument();expect(API.get.mock.calls.some(([url])=>url.includes('/ventas/'))).toBe(false);
    });
    it('la pestaña Mensajes lista cada chat y abre su historial para seguir escribiendo ahí',async()=>{
        const antes=API.get.getMockImplementation(),cambiar=vi.fn();
        API.get.mockImplementation(url=>url==='/oficina/conversaciones/'?Promise.resolve({data:{resultados:[
            {para:'5',persona:{id:5,nombre:'Luis Prueba',rol:'Vendedor'},ultimo:{id:30,autor:luis,destinatario:1,texto:'¿Revisaste la venta 2533?',creado:'2026-10-09T15:00:00Z'},sin_leer:2},
            {para:'equipo',persona:null,ultimo:{id:20,autor:yo,destinatario:null,texto:'Reunión a las 9',creado:'2026-10-08T15:00:00Z'},sin_leer:0}]}})
            :url==='/oficina/mensajes/?para=5'?Promise.resolve({data:{resultados:[{id:30,autor:luis,destinatario:1,texto:'¿Revisaste la venta 2533?',creado:'2026-10-09T15:00:00Z',leido_en:null}],hay_mas:false}}):antes(url));
        montar(<PanelColaboracion estado={estado} onCerrar={vi.fn()} onCambiar={cambiar} borradores={borradores()}/>);
        const chat=await screen.findByRole('button',{name:/Luis Prueba/});
        expect(chat).toHaveTextContent('¿Revisaste la venta 2533?');expect(within(chat).getByLabelText('2 sin leer')).toBeInTheDocument();
        expect(screen.getByRole('button',{name:/Todo el equipo/})).toHaveTextContent('Tú: Reunión a las 9');
        fireEvent.click(chat);
        expect(await screen.findByRole('textbox',{name:'Mensaje para Luis Prueba'})).toBeInTheDocument();
        expect(cambiar).toHaveBeenCalledWith(expect.objectContaining({id:5}));
        fireEvent.change(screen.getByRole('textbox',{name:'Mensaje para Luis Prueba'}),{target:{value:'Sí, ya quedó'}});
        fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/oficina/mensajes/',{texto:'Sí, ya quedó',destinatario:5,destacar:false,horas:4}));
        fireEvent.click(screen.getByRole('button',{name:'Todos los chats'}));
        expect(await screen.findByRole('button',{name:/Nuevo mensaje/})).toBeInTheDocument();
    });
    it('en la oficina muestra un sobre sobre quien te escribió y sobre ti',()=>{
        const abrir=vi.fn();
        montar(<EscenaOficina zonas={zonas} agentes={[{...ana,esPersona:true,mensajes_para_mi:2},{...luis,id:1,nombre:'Responsable Prueba',esPersona:true}]} actividad={new Set()} yo={1} mensajesSinLeer={2} onPersona={abrir} onAgente={vi.fn()} onZona={vi.fn()} animar={false}/>);
        fireEvent.click(screen.getByRole('button',{name:'Ana Prueba te escribió 2 mensajes'}));
        expect(abrir).toHaveBeenCalledWith(expect.objectContaining({id:4}));
        expect(screen.getByRole('button',{name:'Tienes 2 mensajes sin leer'})).toBeInTheDocument();
    });
});
