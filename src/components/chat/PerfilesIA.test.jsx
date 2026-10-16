import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import API from '../../services/api';
import PerfilesIA from './PerfilesIA';
import Retroalimentacion from './Retroalimentacion';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const estado = {
    areas: [{ id: 'ventas', nombre: 'Ventas y asesores', descripcion: 'Ventas' }, { id: 'nomina', nombre: 'Nómina', descripcion: 'Comisiones' }],
    limites: { conocimiento_caracteres: 200000, archivo_bytes: 10485760 },
};
const perfil = {
    id: 3, nombre: 'Analista de ventas', rol: 'Analiza ventas', icono: 'grafica', color: 'verde', areas: ['ventas'], activo: true,
    instrucciones: 'Eres el analista de ventas de Lottus y respondes con tablas cortas.', conocimiento_caracteres: 1000,
    documentos: [{ id: 8, nombre: 'Política.md', tipo: 'md', tamano: 2048, caracteres: 1000, recortado: false }],
};

beforeEach(() => vi.resetAllMocks());

describe('Perfiles de IA', () => {
    it('activa y revoca Página web por perfil sin cambiar las demás áreas', async () => {
        API.put.mockImplementation(async (_url, datos) => ({data:{...perfil,...datos}}));
        render(<PerfilesIA estado={{...estado,areas:[...estado.areas,{id:'pagina_web',nombre:'Página web',descripcion:'Contenido, código e imágenes del sitio.'}]}}
            perfiles={[perfil]} inicial={3} onRecargar={vi.fn()} onVolver={vi.fn()} onProbar={vi.fn()} />);
        const permiso=screen.getByRole('checkbox',{name:/Página web/});
        expect(permiso).not.toBeChecked();
        fireEvent.click(permiso);
        expect(screen.getByText(/Puede estudiar los textos, el catálogo publicado/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
        await waitFor(()=>expect(API.put).toHaveBeenLastCalledWith('/asistente/perfiles/3/',expect.objectContaining({areas:['ventas','pagina_web']})));
        await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar cambios'})).toBeDisabled());
        fireEvent.click(permiso);
        fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
        await waitFor(()=>expect(API.put).toHaveBeenLastCalledWith('/asistente/perfiles/3/',expect.objectContaining({areas:['ventas']})));
    });
    it('crea un perfil desde una plantilla y sube los documentos elegidos antes de guardar', async () => {
        const recargar = vi.fn().mockResolvedValue();
        API.post.mockImplementation(async (url) => (url === '/asistente/perfiles/' ? { data: { ...perfil, id: 9, documentos: [] } } : { data: {} }));
        render(<PerfilesIA estado={estado} perfiles={[]} inicial="nuevo" onRecargar={recargar} onVolver={vi.fn()} onProbar={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Crear perfil' }));
        expect(await screen.findByText('Revisa los campos marcados.')).toBeInTheDocument();
        expect(screen.getByText('Ponle un nombre.')).toBeInTheDocument();
        expect(API.post).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /Coach de asesores/ }));
        expect(screen.getByPlaceholderText('Ej.: Analista de ventas')).toHaveValue('Coach de asesores');
        expect(screen.getByRole('checkbox', { name: /Ventas y asesores/ })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /Nómina/ })).not.toBeChecked();

        const archivo = new File(['# Guion de ventas'], 'Guion.md', { type: 'text/markdown' });
        fireEvent.change(screen.getByLabelText('Subir documentos'), { target: { files: [archivo] } });
        expect(screen.getByText(/se subirá al guardar/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Crear perfil' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/asistente/perfiles/', expect.objectContaining({ nombre: 'Coach de asesores', areas: ['ventas', 'formacion'], icono: 'personas' })));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/asistente/perfiles/9/documentos/', expect.any(FormData), expect.anything()));
        expect(recargar).toHaveBeenCalled();
        expect(await screen.findByText(/Perfil creado/)).toBeInTheDocument();
    });

    it('conserva la zona elegida al crear un agente desde una plantilla', async () => {
        API.post.mockResolvedValue({data:{...perfil,id:9,zona:2,documentos:[]}});
        render(<PerfilesIA estado={{...estado,zonas:[{id:2,nombre:'Showroom'}]}} perfiles={[]} inicial="nuevo" zonaInicial={2}
            onRecargar={vi.fn()} onVolver={vi.fn()} onProbar={vi.fn()} />);
        expect(screen.getByRole('combobox',{name:'Zona en la oficina'})).toHaveValue('2');
        fireEvent.click(screen.getByRole('button',{name:/Coach de asesores/}));
        fireEvent.click(screen.getByRole('button',{name:'Crear perfil'}));
        await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/perfiles/',expect.objectContaining({zona:2,nombre:'Coach de asesores'})));
    });
    it('muestra los errores del servidor junto a cada campo y permite ver lo que lee la IA', async () => {
        API.put.mockRejectedValue({ response: { status: 400, data: { instrucciones: ['Describe con más detalle.'] } } });
        API.get.mockResolvedValue({ data: { texto: 'Máximo 15 % de descuento.' } });
        render(<PerfilesIA estado={estado} perfiles={[perfil]} inicial={3} onRecargar={vi.fn()} onVolver={vi.fn()} onProbar={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
        fireEvent.click(screen.getByRole('radio', { name: 'Morado' }));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        expect(await screen.findByText('Describe con más detalle.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Ver lo que lee la IA de Política.md' }));
        expect(await screen.findByText('Máximo 15 % de descuento.')).toBeInTheDocument();
    });
});

describe('Quién ve cada agente y cómo responde a cada rol', () => {
    const roles = [{ id: 'vendedor', nombre: 'Vendedor' }, { id: 'administrador', nombre: 'Administrador' }, { id: 'auxiliar', nombre: 'Auxiliar' }];
    const conRoles = { ...estado, roles, general: { visible: true, visible_todos: true, roles_visibles: [], instrucciones_roles: {} } };

    it('limita el agente a vendedores con instrucciones propias y avisa qué datos verán', async () => {
        API.put.mockResolvedValue({ data: { ...perfil, visible_todos: false, roles_visibles: ['vendedor'], instrucciones_roles: { vendedor: 'Sé breve.' } } });
        render(<PerfilesIA estado={conRoles} perfiles={[{ ...perfil, visible_todos: true, roles_visibles: [], instrucciones_roles: {} }]} inicial={3} onRecargar={vi.fn()} onVolver={vi.fn()} onProbar={vi.fn()} />);
        expect(screen.getByText(/podrán consultar con él datos de toda la empresa de: Ventas y asesores/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('radio', { name: /Solo algunos roles/ }));
        expect(screen.queryByRole('checkbox', { name: 'Administrador' })).not.toBeInTheDocument(); // siempre lo ven
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        expect(await screen.findByText('Elige al menos un rol o déjalo visible para todos.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Vendedor' }));
        fireEvent.click(screen.getByRole('button', { name: /Vendedor.*Igual que a todos/ }));
        fireEvent.change(screen.getByLabelText('Cómo responder a Vendedor'), { target: { value: 'Sé breve.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        await waitFor(() => expect(API.put).toHaveBeenCalledWith('/asistente/perfiles/3/', expect.objectContaining({
            visible_todos: false, roles_visibles: ['vendedor'], instrucciones_roles: { vendedor: 'Sé breve.' } })));
    });

    it('configura a quién le aparece la IA Lottus general', async () => {
        API.put.mockResolvedValue({ data: { visible: true, visible_todos: false, roles_visibles: ['auxiliar'], instrucciones_roles: {} } });
        const recargar = vi.fn().mockResolvedValue();
        render(<PerfilesIA estado={conRoles} perfiles={[perfil]} inicial={3} onRecargar={recargar} onVolver={vi.fn()} onProbar={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /IA Lottus \(general\)/ }));
        fireEvent.click(screen.getByRole('radio', { name: /Solo algunos roles/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Auxiliar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        await waitFor(() => expect(API.put).toHaveBeenCalledWith('/asistente/general/', { visible_todos: false, roles_visibles: ['auxiliar'], instrucciones_roles: {} }));
        expect(recargar).toHaveBeenCalled();
        expect(await screen.findByText(/Lo ven: Auxiliar/)).toBeInTheDocument();
    });
});

describe('Entrenar a la IA desde una respuesta', () => {
    const m = { id: 21, rol: 'asistente', estado: 'listo', texto: 'Vamos bien', valoracion: null, comentario: '', notas: [] };

    it('valora con 👎, agrega el motivo y una nota para recordar', async () => {
        const actualizar = vi.fn();
        API.post.mockImplementation(async (url, datos) => ({ data: url.endsWith('/notas/')
            ? { ...m, notas: [{ id: 1, texto: datos.texto }] } : { ...m, valoracion: datos.valoracion, comentario: datos.comentario || '' } }));
        render(<Retroalimentacion m={m} agente="Analista de ventas" onActualizado={actualizar} onCopiar={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'No me gustó' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/asistente/mensajes/21/valorar/', { valoracion: 'mejora' }));
        const panel = await screen.findByText(/¿Qué no te gustó\?/);
        fireEvent.click(screen.getByRole('button', { name: 'Muy largo' }));
        fireEvent.change(screen.getByLabelText('Comentario para la IA'), { target: { value: 'Solo 3 viñetas' } });
        fireEvent.click(within(panel.parentElement).getByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/asistente/mensajes/21/valorar/', { valoracion: 'mejora', comentario: 'Muy largo · Solo 3 viñetas' }));
        expect(await screen.findByText(/Analista de ventas lo tendrá en cuenta/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Enseñar/ }));
        fireEvent.change(screen.getByLabelText('Qué debe recordar la IA'), { target: { value: 'Cifras en millones' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/asistente/mensajes/21/notas/', { texto: 'Cifras en millones' }));
        expect(actualizar).toHaveBeenLastCalledWith(expect.objectContaining({ notas: [{ id: 1, texto: 'Cifras en millones' }] }));
    });
});
