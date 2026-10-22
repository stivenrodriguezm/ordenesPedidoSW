import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import API from '../services/api';
import ProductosVenta from './ProductosVenta';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
// Las imágenes se generan con html2canvas; aquí solo importa cuáles se descargan.
const descargas = vi.fn();
vi.mock('../utils/descargarImagen', async (original) => ({ ...(await original()), descargarImagen: async (_nodo, nombre) => descargas(nombre) }));

const linea = {
    id: 5, cantidad: 1, variante: null, producto_nombre: 'Producto especial', precio_lista_unitario: '1000', precio_lista_override: '1000',
    opcionales: [], adicionales: [], texto_cliente: 'Texto del cliente', texto_proveedor: 'Fabricar en roble', sin_texto_proveedor: false,
    motivo_precio: 'Autorización', por_pedir: 1, pedidas: 0, referencia: 8, referencia_nombre: 'Sofá fábrica', proveedor_nombre: 'Fábrica', pedidos: [],
    tela_modo: 'aparte', tela_material: 'tela', tela_referencia: 'Lino', tela_color: 'Arena', tela_proveedor: 3, tela_proveedor_nombre: 'Ariatex',
    tela_cantidad: '6.00', tela_unidad: 'm', tela_pedidos: [], tela_direccion_sugerida: 'Fábrica - Calle 1', tela_orden: null, grupo_es_cuero: false, proveedor: 9,
    tela_grupo: 7, tela_grupo_nombre: 'Grupo 1', tela_costo: '20000.00', conjunto: '', conjunto_nombre: '', conjunto_cantidad: 1,
};
const GRUPOS = [{ id: 7, nombre: 'Grupo 1', tipo: 'tela', precio_por_metro: '20000.00' }, { id: 9, nombre: 'Cuero nacional', tipo: 'cuero', precio_por_metro: '3500.00' }];
const gestion = { estado: 'atrasada', pendientes: ['Producto 1 (Producto especial): falta pedirlo al proveedor (1 u.).'], finalizada_en: null, finalizada_por: null };
const base = { gestion, venta: 12, revision: 4, vendedor_nombre: 'Ana', fecha_entrega: '2099-01-15', es_feria_hogar: false, confirmados: true, valor_total: '900', valor_lista: '1000', pedidos_sin_vincular: [], lineas: [linea] };
const todos = () => true;
const conConsultas = ui => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>;
const montar = (perms = todos) => render(conConsultas(<MemoryRouter><ProductosVenta ventaId={12} hasPermission={perms} /></MemoryRouter>));

beforeEach(() => {
    vi.resetAllMocks();
    API.get.mockImplementation(async (url) => {
        if (url === '/proveedores-telas/') return { data: { results: [{ id: 3, nombre_empresa: 'Ariatex' }, { id: 4, nombre_empresa: 'Distritelas' }] } };
        if (url === '/direcciones-entrega/') return { data: { results: [{ id: 1, nombre: 'Fábrica', detalles: 'Calle 1' }, { id: 2, nombre: 'Lottus', detalles: 'Carrera 50' }] } };
        if (url === '/productos-venta/catalogo/') return { data: { grupos: GRUPOS, results: [] } };
        return { data: structuredClone(base) };
    });
    API.post.mockImplementation(async (url) => (url.endsWith('/calcular/') ? { data: { precio_lista_unitario: '1000' } } : { data: { ...base, revision: 5 } }));
});

async function editar() {
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar productos' }));
    // Como en una factura, cada producto guardado se ve en una fila; sus detalles se despliegan.
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles del producto 1' }));
    return screen.findByDisplayValue('Texto del cliente');
}
const guardados = () => API.post.mock.calls.filter(([url]) => url === '/ventas/12/productos/');

describe('Productos de la venta (en la misma vista)', () => {
    it('selecciona la subcategoría exacta con su referencia y proveedor, sin elegir una referencia genérica', async () => {
        const producto = { id: 901, nombre: 'Valencia · Silla de comedor', subcategoria: 71, subcategoria_nombre: 'Silla de comedor',
            referencia: 81, referencia_nombre: 'Valencia', proveedor_nombre: 'Sillas Sur', categoria: 'Comedor', tela: false,
            catalogo_actual: true, seleccionable: true, estado_precio: 'publicado', referencias: [{ id: 81, nombre: 'Valencia · Silla de comedor · Sillas Sur' }], opcionales: [] };
        API.get.mockImplementation(async url => url === '/productos-venta/catalogo/'
            ? { data: { results: [producto], count: 1, grupos: GRUPOS } }
            : url === '/proveedores-telas/' ? { data: { results: [] } } : { data: { ...structuredClone(base), lineas: [] } });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: 'Agregar productos' }));
        fireEvent.click(await screen.findByRole('button', { name: /Valencia · Silla de comedor/ }));
        const tarjeta = await screen.findByRole('article', { name: 'Producto 1' });
        expect(await within(tarjeta).findByText('Valencia · Silla de comedor · Sillas Sur')).toBeInTheDocument();
        expect(within(tarjeta).queryByRole('button', { name: 'Cambiar', exact: true })).not.toBeInTheDocument();
        fireEvent.click(within(tarjeta).getByLabelText('No aplica'));
        await waitFor(() => expect(API.post.mock.calls.some(([url]) => url.endsWith('/calcular/'))).toBe(true));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await waitFor(() => expect(guardados()).toHaveLength(1));
        expect(guardados()[0][1].lineas[0]).toMatchObject({ variante: 901, referencia: 81, producto_nombre: 'Valencia' });
    });

    it('permite encontrar subcategorías después de los primeros 40 resultados', async () => {
        API.get.mockImplementation(async (url, config) => {
            if (url === '/productos-venta/catalogo/') {
                const segunda = config?.params?.page === 2;
                return { data: { results: [{ id: segunda ? 902 : 901, nombre: segunda ? 'Valencia · Comedor de 6p.' : 'Valencia · Mesa', activo: true }], count: 2, grupos: [] } };
            }
            return { data: { ...structuredClone(base), lineas: [] } };
        });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: 'Agregar productos' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Ver más subcategorías' }));
        expect(await screen.findByRole('button', { name: 'Valencia · Comedor de 6p.' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Valencia · Mesa' })).toBeInTheDocument();
    });

    it('identifica los borradores y evita seleccionarlos como productos listos para vender', async () => {
        API.get.mockImplementation(async url => url === '/productos-venta/catalogo/' ? { data: { results: [{ id: 901, nombre: 'Valencia · Silla', activo: false, seleccionable: false, estado_precio: 'borrador' }], grupos: [] } }
            : { data: { ...structuredClone(base), lineas: [] } });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: 'Agregar productos' }));
        const opcion = await screen.findByRole('button', { name: /Valencia · Silla/ });
        expect(opcion).toBeDisabled();
        expect(opcion).toHaveTextContent('Borrador · pendiente de publicar');
        expect(screen.queryByRole('article', { name: 'Producto 1' })).not.toBeInTheDocument();
    });
    it('muestra los productos, sus textos y el descuento calculado con el precio de lista', async () => {
        montar();
        expect(await screen.findByText('Producto especial')).toBeInTheDocument();
        expect(screen.getByText('Fabricar en roble')).toBeInTheDocument();
        expect(screen.getByText('Texto del cliente')).toBeInTheDocument();
        expect(screen.getByText('10 %')).toBeInTheDocument();
        expect(screen.getByText('Por pedir 1')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('el formulario no pide precio unitario, descuento, fecha ni especificaciones', async () => {
        await editar();
        expect(screen.queryByText(/Precio unitario/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Descuento total de esta línea/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Entrega acordada/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Especificaciones/i)).not.toBeInTheDocument();
        expect(screen.getByText('Sofá fábrica')).toBeInTheDocument();
    });

    it('guarda con "No aplica" en el texto del proveedor y sin precios por producto', async () => {
        await editar();
        fireEvent.click(screen.getByLabelText('No aplica'));
        fireEvent.change(screen.getByDisplayValue('Texto del cliente'), { target: { value: 'Nuevo texto cliente' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        const [, body, config] = guardados()[0];
        expect(body).toMatchObject({ revision: 4, lineas: [{ id: 5, sin_texto_proveedor: true, texto_proveedor: '', texto_cliente: 'Nuevo texto cliente' }] });
        expect(body.lineas[0]).not.toHaveProperty('precio_unitario');
        expect(body.lineas[0]).not.toHaveProperty('descuento');
        expect(body.lineas[0]).not.toHaveProperty('fecha_compromiso');
        expect(body.lineas[0]).not.toHaveProperty('especificaciones');
        expect(config.headers['Idempotency-Key']).toBeTruthy();
    });

    it('un reintento tras perder la red reutiliza la clave de idempotencia', async () => {
        await editar();
        API.post.mockImplementation(async (url) => {
            if (url.endsWith('/calcular/')) return { data: { precio_lista_unitario: '1000' } };
            throw new Error('Red caída');
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByRole('alert');
        API.post.mockImplementation(async (url) => (url.endsWith('/calcular/') ? { data: { precio_lista_unitario: '1000' } } : { data: base }));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await waitFor(() => expect(guardados()).toHaveLength(2));
        expect(guardados()[1][2].headers['Idempotency-Key']).toBe(guardados()[0][2].headers['Idempotency-Key']);
    });

    it('un conflicto de revisión conserva lo escrito y ofrece recargar', async () => {
        await editar();
        API.post.mockImplementation(async (url) => {
            if (url.endsWith('/calcular/')) return { data: { precio_lista_unitario: '1000' } };
            throw { response: { status: 409, data: { detail: 'Los productos cambiaron. Recarga antes de continuar.' } } };
        });
        fireEvent.change(screen.getByDisplayValue('Texto del cliente'), { target: { value: 'Borrador local' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Los productos cambiaron');
        expect(screen.getByDisplayValue('Borrador local')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Recargar y descartar mis cambios' })).toBeInTheDocument();
    });

    it('mientras carga muestra un esqueleto, no texto suelto', async () => {
        API.get.mockReturnValue(new Promise(() => {}));
        montar();
        expect(screen.getByLabelText('Cargando productos')).toHaveAttribute('aria-busy', 'true');
    });

    it('un recargo se suma al precio sin pedir motivo y solo cuando está completo', async () => {
        await editar();
        const calculos = () => API.post.mock.calls.filter(([url]) => url.endsWith('/calcular/'));
        fireEvent.click(screen.getByRole('button', { name: '+ Recargo' }));
        await new Promise(r => setTimeout(r, 450));
        expect(calculos().every(([, body]) => body.adicionales.length === 0)).toBe(true);
        fireEvent.change(screen.getByLabelText('Descripción del recargo 1'), { target: { value: 'Patas en acero' } });
        fireEvent.change(screen.getByLabelText('Valor del recargo 1'), { target: { value: '150000' } });
        await waitFor(() => expect(calculos().at(-1)[1].adicionales).toEqual([{ descripcion: 'Patas en acero', importe_lista: '150000' }]));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas[0].adicionales).toEqual([{ descripcion: 'Patas en acero', importe_lista: '150000' }]);
    });

    it('no guarda un recargo a medias', async () => {
        await editar();
        fireEvent.click(screen.getByRole('button', { name: '+ Recargo' }));
        fireEvent.change(screen.getByLabelText('Valor del recargo 1'), { target: { value: '5000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/No se guardó: faltan datos en Producto 1 \(Producto especial\): recargo/);
        expect(screen.getByText('Completa el recargo (qué es y su valor) o quítalo.')).toBeInTheDocument();
        expect(guardados()).toHaveLength(0);
    });

    it('muestra referencia, color, proveedor y cantidad de la tela, y si falta pedirla', async () => {
        montar();
        expect(await screen.findByText('Tela: Lino · color Arena')).toBeInTheDocument();
        expect(screen.getByText(/Ariatex · 6 m/)).toBeInTheDocument();
        expect(screen.getByText('Tela por pedir')).toBeInTheDocument();
    });

    it('cada producto registra la tela como en /telas: material, referencia, color, proveedor y cantidad', async () => {
        await editar();
        expect(screen.getByRole('radio', { name: 'Sí, la compramos aparte' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('radio', { name: 'Tela (m)' })).toHaveAttribute('aria-checked', 'true');
        const proveedor = screen.getByLabelText('Proveedor de tela del producto 1');
        await waitFor(() => expect(proveedor).toHaveTextContent('Distritelas'));
        fireEvent.change(proveedor, { target: { value: '4' } });
        fireEvent.change(screen.getByLabelText('Referencia de tela del producto 1'), { target: { value: 'Manhattan' } });
        fireEvent.change(screen.getByLabelText('Color de tela del producto 1'), { target: { value: 'Marfil 03' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas[0]).toMatchObject({ tela_modo: 'aparte', tela_material: 'tela', tela_proveedor: 4,
            tela_referencia: 'Manhattan', tela_color: 'Marfil 03', tela_cantidad: '6.00' });
    });

    it('si es cuero se pide en decímetros y no arrastra los metros', async () => {
        await editar();
        fireEvent.click(screen.getByRole('radio', { name: 'Cuero (dm)' }));
        expect(screen.getByLabelText('Cantidad de cuero del producto 1')).toHaveValue(null);
        expect(screen.getByText('Cantidad (dm)')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Cantidad de cuero del producto 1'), { target: { value: '1200' } });
        // El grupo de tela no sirve para cuero: hay que elegir uno de cuero (su costo es por decímetro).
        expect(screen.getByLabelText('Grupo de cuero del producto 1')).toHaveValue('');
        fireEvent.change(screen.getByLabelText('Grupo de cuero del producto 1'), { target: { value: '9' } });
        expect(screen.getByLabelText('Costo de cuero por decímetro del producto 1')).toHaveValue(3500);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas[0]).toMatchObject({ tela_material: 'cuero', tela_cantidad: '1200', tela_grupo: 9, tela_costo: '3500' });
    });

    it('"La incluye el proveedor" no envía proveedor ni cantidad', async () => {
        await editar();
        fireEvent.click(screen.getByRole('radio', { name: 'Sí, la pone el proveedor' }));
        expect(screen.queryByLabelText('Proveedor de tela del producto 1')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas[0]).toMatchObject({ tela_modo: 'incluida', tela_proveedor: null, tela_cantidad: null, tela_referencia: 'Lino', tela_color: 'Arena' });
    });

    it('pide las telas: solo agrupa mismo proveedor y misma dirección, y descarga una imagen por pedido', async () => {
        const otra = { ...linea, id: 6, producto_nombre: 'Poltrona', tela_referencia: 'Nappa', tela_color: 'Miel', tela_material: 'cuero', tela_cantidad: '1200', tela_direccion_sugerida: '' };
        const tercera = { ...linea, id: 7, producto_nombre: 'Puff', tela_direccion_sugerida: 'Lottus - Carrera 50' };
        API.get.mockImplementation(async (url) => {
            if (url === '/proveedores-telas/') return { data: { results: [{ id: 3, nombre_empresa: 'Ariatex' }] } };
            if (url === '/direcciones-entrega/') return { data: { results: [{ id: 1, nombre: 'Fábrica', detalles: 'Calle 1' }, { id: 2, nombre: 'Lottus', detalles: 'Carrera 50' }] } };
            return { data: { ...base, lineas: [linea, otra, tercera] } };
        });
        let id = 1500;
        API.post.mockImplementation(async () => ({ data: { id: id++ } }));
        montar();
        fireEvent.click(await screen.findByRole('button', { name: 'Pedir telas (3)' }));
        await waitFor(() => expect(screen.getByLabelText('Dirección 1 × Poltrona')).toHaveTextContent('Lottus - Carrera 50'));
        expect(screen.getByRole('button', { name: /Crear 2 pedidos de tela|Crear pedido de tela|Crear 3 pedidos de tela/ })).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Dirección 1 × Poltrona'), { target: { value: 'Fábrica - Calle 1' } });
        // Lino a Fábrica, Nappa (cuero) a Fábrica y Lino a Lottus: tres pedidos distintos.
        expect(screen.getByText('Se crearán 3 pedidos de tela:')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Observación pedido Ariatex Lottus - Carrera 50'), { target: { value: 'Urgente' } });
        fireEvent.click(screen.getByRole('button', { name: 'Crear 3 pedidos de tela' }));
        await waitFor(() => expect(descargas).toHaveBeenCalledTimes(3));
        const cuerpos = API.post.mock.calls.map(([url, body]) => (expect(url).toBe('/pedidos-telas/'), body));
        expect(cuerpos).toEqual([
            expect.objectContaining({ proveedor: 3, direccion_entrega: 'Fábrica - Calle 1', venta: 12, detalles: [{ tela: 'Lino - Color: Arena', cantidad: 6, linea_venta: 5 }] }),
            expect.objectContaining({ proveedor: 3, direccion_entrega: 'Fábrica - Calle 1', detalles: [{ tela: '[CUERO] Nappa - Color: Miel', cantidad: 1200, linea_venta: 6 }] }),
            expect.objectContaining({ proveedor: 3, direccion_entrega: 'Lottus - Carrera 50', observacion: 'Urgente', detalles: [{ tela: 'Lino - Color: Arena', cantidad: 6, linea_venta: 7 }] }),
        ]);
        expect(descargas.mock.calls.map(c => c[0])).toEqual(['pedido_material_1500.png', 'pedido_material_1501.png', 'pedido_material_1502.png']);
        expect(await screen.findByText(/Se descargaron las 3 imágenes/)).toBeInTheDocument();
    });

    it('la gestión muestra lo que falta y no deja finalizar hasta completarlo', async () => {
        montar();
        expect(await screen.findByText('Atrasada')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Finalizar gestión' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: /Falta 1 cosa/ }));
        expect(screen.getByText(/falta pedirlo al proveedor/)).toBeInTheDocument();
    });

    it('finaliza la gestión cuando ya se pidió todo', async () => {
        API.get.mockResolvedValue({ data: { ...base, gestion: { ...gestion, estado: 'pendiente', pendientes: [] } } });
        API.post.mockResolvedValue({ data: { ...base, gestion: { estado: 'finalizada', pendientes: [], finalizada_en: '2026-10-08T15:00:00Z', finalizada_por: 'Ana' } } });
        const onActualizada = vi.fn();
        render(conConsultas(<MemoryRouter><ProductosVenta ventaId={12} hasPermission={todos} onActualizada={onActualizada} /></MemoryRouter>));
        fireEvent.click(await screen.findByRole('button', { name: 'Finalizar gestión' }));
        await screen.findByText(/Gestión finalizada/);
        expect(API.post).toHaveBeenCalledWith('/ventas/12/gestion/', { revision: 4, accion: 'finalizar' });
        expect(screen.getByText('Finalizada')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
        expect(onActualizada).toHaveBeenCalled();
    });

    it('no guarda un producto incompleto: dice qué falta y marca cada campo', async () => {
        await editar();
        // El texto para el cliente y la remisión es opcional: vacío no bloquea.
        fireEvent.change(screen.getByDisplayValue('Texto del cliente'), { target: { value: '' } });
        expect(screen.getByPlaceholderText('Si lo dejas vacío, la remisión dirá «Producto especial»')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Color de tela del producto 1'), { target: { value: '' } });
        // Sin costo escrito vale el del grupo en la lista de precios: no bloquea.
        fireEvent.change(screen.getByLabelText('Costo de tela por metro del producto 1'), { target: { value: '' } });
        expect(screen.getByLabelText('Costo de tela por metro del producto 1')).toHaveAttribute('placeholder', '20000');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('faltan datos en Producto 1 (Producto especial): color de la tela.');
        expect(guardados()).toHaveLength(0);
        expect(screen.getByLabelText('Color de tela del producto 1')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText('Escribe el color de la tela.')).toBeInTheDocument();
        expect(screen.getByText('Falta 1 dato')).toBeInTheDocument();
        // Al completarlo, la marca desaparece y ya guarda.
        fireEvent.change(screen.getByLabelText('Color de tela del producto 1'), { target: { value: 'Arena' } });
        expect(screen.queryByText('Escribe el color de la tela.')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas[0]).toMatchObject({ texto_cliente: '', tela_costo: null, tela_grupo: 7 });
    });

    it('sin grupo con costo, la tela comprada aparte pide el costo del proveedor', async () => {
        API.get.mockImplementation(async (url) => {
            if (url === '/proveedores-telas/') return { data: { results: [{ id: 3, nombre_empresa: 'Ariatex' }] } };
            if (url === '/productos-venta/catalogo/') return { data: { grupos: [{ ...GRUPOS[0], precio_por_metro: '0' }, GRUPOS[1]], results: [] } };
            return { data: { ...structuredClone(base), lineas: [{ ...linea, tela_costo: null }] } };
        });
        await editar();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('costo de la tela');
        expect(screen.getByText('Indica el costo del proveedor por metro.')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Costo de tela por metro del producto 1'), { target: { value: '18000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas[0]).toMatchObject({ tela_costo: '18000', tela_grupo: 7 });
    });

    it('los errores por campo del servidor se marcan en el formulario', async () => {
        await editar();
        API.post.mockImplementation(async (url) => {
            if (url.endsWith('/calcular/')) return { data: { precio_lista_unitario: '1000' } };
            throw { response: { status: 400, data: { lineas: { 0: { referencia: ['Elige la referencia de compra (proveedor) de este producto.'] } } } } };
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        expect(await screen.findByText('Elige la referencia de compra (proveedor) de este producto.', { selector: '.pv-falta-msg' })).toBeInTheDocument();
    });

    it('agrega transporte, artículos adicionales y ajustes que suman o restan', async () => {
        await editar();
        fireEvent.click(screen.getByRole('button', { name: '+ Transporte' }));
        fireEvent.change(screen.getByLabelText('Descripción Transporte'), { target: { value: 'Transporte a Chía' } });
        fireEvent.change(screen.getByLabelText('Valor Transporte'), { target: { value: '150000' } });
        fireEvent.click(screen.getByRole('button', { name: '+ Artículo adicional' }));
        fireEvent.change(screen.getByLabelText('Descripción Artículo adicional'), { target: { value: 'Jarrón' } });
        fireEvent.change(screen.getByLabelText('Cantidad Artículo adicional'), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText('Valor Artículo adicional'), { target: { value: '40000' } });
        fireEvent.click(screen.getByRole('button', { name: '+ Ajuste (suma o resta)' }));
        expect(screen.getByRole('radio', { name: 'Resta' })).toHaveAttribute('aria-checked', 'true');
        fireEvent.change(screen.getByLabelText('Descripción Ajuste'), { target: { value: 'No lleva cojines' } });
        fireEvent.change(screen.getByLabelText('Valor Ajuste'), { target: { value: '30000' } });
        // 1.000 del producto + 150.000 + 2 × 40.000 − 30.000
        expect(screen.getAllByText('$201.000').length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas.slice(1)).toEqual([
            expect.objectContaining({ tipo: 'transporte', producto_nombre: 'Transporte a Chía', cantidad: 1, precio_lista_override: '150000' }),
            expect.objectContaining({ tipo: 'articulo', producto_nombre: 'Jarrón', cantidad: 2, precio_lista_override: '40000' }),
            expect.objectContaining({ tipo: 'ajuste', producto_nombre: 'No lleva cojines', precio_lista_override: '-30000' }),
        ]);
    });

    it('un servicio sin valor no se guarda', async () => {
        await editar();
        fireEvent.click(screen.getByRole('button', { name: '+ Transporte' }));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Transporte (Transporte): valor o precio');
        expect(guardados()).toHaveLength(0);
    });

    it('muestra los servicios y ajustes aparte de los productos', async () => {
        API.get.mockResolvedValue({ data: { ...base, lineas: [linea, { ...linea, id: 9, tipo: 'ajuste', producto_nombre: 'No lleva cojines', precio_lista_unitario: '-200', cantidad: 1 }] } });
        montar();
        expect(await screen.findByText('Servicios y ajustes')).toBeInTheDocument();
        expect(screen.getByText('No lleva cojines')).toBeInTheDocument();
        expect(screen.getByText('− $200')).toBeInTheDocument();
    });

    it('relaciona un pedido anterior con cualquier producto o lo marca como ajeno', async () => {
        const otro = { ...linea, id: 6, producto_nombre: 'Poltrona', referencia: 22, referencia_nombre: 'Poltrona KRF' };
        API.get.mockResolvedValue({ data: { ...base, lineas: [linea, otro], pedidos_sin_vincular: [
            { detalle: 31, pedido: 1571, referencia: 99, referencia_nombre: 'Sobre', cantidad: 1, texto: 'Sobre en vidrio' },
            { detalle: 32, pedido: 1571, referencia: 98, referencia_nombre: 'Cojín', cantidad: 1, texto: '' }] } });
        API.post.mockResolvedValue({ data: base });
        montar();
        const sobre = await screen.findByLabelText('Producto de la OP 1571 (Sobre)');
        expect(sobre.querySelectorAll('option')).toHaveLength(4);
        fireEvent.change(sobre, { target: { value: '6' } });
        fireEvent.change(screen.getByLabelText('Producto de la OP 1571 (Cojín)'), { target: { value: 'ninguno' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(API.post).toHaveBeenCalled());
        expect(API.post.mock.calls[0][1]).toEqual({ revision: 4, vinculos: [{ detalle: 31, linea: 6 }, { detalle: 32, linea: null }] });
    });

    it('sin permiso de edición solo consulta', async () => {
        montar(p => p === 'VER_PRECIOS_VENTA');
        await screen.findByText('Producto especial');
        expect(screen.queryByRole('button', { name: 'Editar productos' })).not.toBeInTheDocument();
        expect(screen.queryByText(/Pedir al proveedor/)).not.toBeInTheDocument();
    });

    it('crea una orden por proveedor con fecha, estado de tela y observación, y descarga su imagen', async () => {
        API.post.mockResolvedValue({ data: { ordenes: [77], detalle: [{ id: 77, proveedor: 9 }], revision: 5 } });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /Preparar pedido/ }));
        expect(API.post).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Fecha esperada Fábrica')).toHaveValue('2099-01-15');
        expect(screen.getByLabelText('Estado de tela Fábrica')).toHaveValue('Por pedir');
        fireEvent.change(screen.getByLabelText('Descripción Producto especial'), { target: { value: 'Texto propio de esta OP' } });
        fireEvent.change(screen.getByLabelText('Observación Fábrica'), { target: { value: 'Entregar en la mañana' } });
        fireEvent.click(screen.getByRole('button', { name: 'Crear orden' }));
        await waitFor(() => expect(descargas).toHaveBeenCalledWith('pedido_77.png'));
        expect(API.post.mock.calls[0][1]).toMatchObject({ revision: 4, lineas: [{ linea: 5, cantidad: 1, texto_proveedor: 'Texto propio de esta OP' }],
            ordenes: [{ proveedor: 9, fecha_esperada: '2099-01-15', observacion: 'Entregar en la mañana', tela: 'Por pedir' }] });
        expect(await screen.findByText(/OP 77\. Se descargaron la imagen/)).toBeInTheDocument();
    });

    it('con pedidos ofrece preparar la remisión pero no recibir la OP', async () => {
        API.get.mockResolvedValue({ data: { ...base, lineas: [{ ...linea, pedidos: [{ id: 77, cantidad: 1, recibidas: 0 }], pedidas: 1, por_pedir: 0 }] } });
        montar();
        expect(await screen.findByRole('button', { name: /Preparar remisión/ })).toBeEnabled();
        expect(screen.queryByRole('button', { name: /Recibir OP/ })).not.toBeInTheDocument();
        expect(screen.getByText('Pedido · 0/1 recibidos')).toBeInTheDocument();
    });

    it('el editor ya no ofrece "Sale de bodega"', async () => {
        await editar();
        expect(screen.queryByRole('button', { name: 'Sale de bodega' })).not.toBeInTheDocument();
    });


    it('un juego del catálogo entra como conjunto; el grupo de tela solo se pide en la tela de cada pieza', async () => {
        const juego = { id: 40, nombre: 'Qatar · Comedor 6 puestos', categoria: 'Comedores', activo: true, tela: true, juego: '1 Mesa de 6 + 6 Silla de comedor',
            piezas: [{ variante: 41, nombre: 'Mesa de 6', cantidad: 1, tela: false, grupos: [] }, { variante: 42, nombre: 'Silla de comedor', cantidad: 6, tela: true, grupos: [7] }] };
        API.get.mockImplementation(async (url, config) => {
            if (url === '/proveedores-telas/') return { data: { results: [] } };
            if (url === '/productos-venta/catalogo/') {
                const id = config?.params?.id;
                if (id === 41) return { data: { grupos: GRUPOS, results: [{ id: 41, nombre: 'Qatar · Mesa de 6', tela: false, grupos: [], opcionales: [], referencias: [{ id: 81, nombre: 'Mesa Qatar · Fábrica' }] }] } };
                if (id === 42) return { data: { grupos: GRUPOS, results: [{ id: 42, nombre: 'Qatar · Silla de comedor', tela: true, metraje: '1', grupos: [7], opcionales: [], referencias: [{ id: 82, nombre: 'Silla Qatar · Fábrica' }] }] } };
                return { data: { grupos: GRUPOS, results: config?.params?.q !== undefined ? [juego] : [] } };
            }
            return { data: { ...structuredClone(base), lineas: [] } };
        });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: 'Agregar productos' }));
        fireEvent.click(await screen.findByRole('button', { name: /Qatar · Comedor 6 puestos/ }));
        const conjunto = await screen.findByRole('region', { name: 'Conjunto Qatar · Comedor 6 puestos' });
        expect(screen.getByLabelText('Cantidad del producto 1')).toHaveValue(1);
        expect(screen.getByLabelText('Cantidad del producto 2')).toHaveValue(6);
        // Dos comedores: cada pieza se multiplica por su cantidad por conjunto.
        fireEvent.change(screen.getByLabelText('Cantidad de conjuntos'), { target: { value: '2' } });
        expect(screen.getByLabelText('Cantidad del producto 1')).toHaveValue(2);
        expect(screen.getByLabelText('Cantidad del producto 2')).toHaveValue(12);
        // El grupo solo se pregunta en la tela, y solo si la pieza lleva tela: la mesa no tiene.
        const silla = screen.getByRole('article', { name: 'Producto 2' });
        await waitFor(() => expect(within(silla).getByTitle('El grupo define el precio de lista')).toBeInTheDocument());
        expect(screen.queryByLabelText('Grupo de tela del producto 1')).not.toBeInTheDocument();
        expect(within(silla).queryByRole('radio', { name: 'No' })).not.toBeInTheDocument();
        fireEvent.click(within(silla).getByRole('radio', { name: 'Sí, la pone el proveedor' }));
        fireEvent.change(screen.getByLabelText('Grupo de tela del producto 2'), { target: { value: '7' } });
        // La pone el proveedor: sin costo; si la compramos aparte, arranca con el del grupo.
        expect(screen.queryByLabelText('Costo de tela por metro del producto 2')).not.toBeInTheDocument();
        fireEvent.click(within(silla).getByRole('radio', { name: 'Sí, la compramos aparte' }));
        expect(screen.getByLabelText('Costo de tela por metro del producto 2')).toHaveValue(20000);
        expect(conjunto).toHaveTextContent('2 piezas · se ven juntas, cada una se pide con su referencia');
    });

    it('se puede guardar aunque se quiten todos los productos', async () => {
        await editar();
        fireEvent.click(screen.getByRole('button', { name: 'Quitar producto 1' }));
        const guardar = screen.getByRole('button', { name: 'Guardar productos' });
        expect(guardar).toBeEnabled();
        API.post.mockImplementation(async (url) => (url.endsWith('/calcular/') ? { data: { precio_lista_unitario: '1000' } } : { data: { ...base, lineas: [], revision: 5 } }));
        fireEvent.click(guardar);
        expect(await screen.findByText('Se quitaron todos los productos de la venta.')).toBeInTheDocument();
        expect(guardados()[0][1]).toMatchObject({ revision: 4, lineas: [] });
    });

    it('si la tela la pone el proveedor (tela o cuero) no pide ni envía costo', async () => {
        await editar();
        expect(screen.getByLabelText('Costo de tela por metro del producto 1')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('radio', { name: 'Sí, la pone el proveedor' }));
        expect(screen.queryByLabelText('Costo de tela por metro del producto 1')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('radio', { name: 'Cuero (dm)' }));
        fireEvent.change(screen.getByLabelText('Grupo de cuero del producto 1'), { target: { value: '9' } });
        expect(screen.queryByLabelText('Costo de cuero por decímetro del producto 1')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
        await screen.findByText(/Productos guardados/);
        expect(guardados()[0][1].lineas[0]).toMatchObject({ tela_modo: 'incluida', tela_material: 'cuero', tela_grupo: 9, tela_costo: null });
    });

    it('las tarjetas muestran los «Cojines incluidos» y el decorativo cubierto', async () => {
        API.get.mockImplementation(async (url) => (url === '/ventas/12/productos/'
            ? { data: { ...structuredClone(base), lineas: [{ ...linea, da_decorativos: true },
                { ...linea, id: 6, producto_nombre: 'Decorativos', variante_nombre: 'Cojín 45', cantidad: 2, decorativos_incluidos: { unidades: 2, valor: '120000.00' } }] } }
            : { data: { results: [] } }));
        montar();
        expect(await screen.findByText(/Incluye 2 decorativos por unidad/)).toBeInTheDocument();
        expect(screen.getByText(/Incluidos 2 por «Cojines incluidos»: −\$120\.000/)).toBeInTheDocument();
    });
});
