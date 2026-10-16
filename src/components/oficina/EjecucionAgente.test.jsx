import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import API from '../../services/api';
import EjecucionAgente, { EjecucionesAgente } from './EjecucionAgente';

vi.mock('../../services/api',()=>({default:{get:vi.fn(),post:vi.fn()}}));
const trabajo={id:12,estado:'listo',agente:{id:5,nombre:'Alan'},pasos_guardados:1,resultado:'Venta guardada con sus productos.',conversacion:42,
  pasos:[{clave:'venta',operacion:'registrar_ventas_con_productos',resultado:{ventas_registradas:1,ventas:[{
    venta_id:123,productos:2,fecha_venta:'2026-10-09',url:'/ventas?q=123&modo=range&desde=2026-10-09&hasta=2026-10-09'}]}}]};
const mostrar=elemento=>{
  const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});
  const vista=render(<QueryClientProvider client={cache}><MemoryRouter>{elemento}</MemoryRouter></QueryClientProvider>);
  return {...vista,cache};
};
beforeEach(()=>vi.resetAllMocks());

describe('Resultados reales del agente ejecutor (Alan)',()=>{
  it('informa que el motor está desconectado sin afirmar que ya ejecuta la solicitud',async()=>{
    API.get.mockResolvedValue({data:{...trabajo,estado:'pendiente',resultado:'',pasos:[],pasos_guardados:0,motor:{activo:false}}});
    mostrar(<EjecucionAgente id={12}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('El motor de IA está desconectado. La solicitud está guardada y Alan empezará cuando se restablezca.');
    expect(screen.queryByText(/Alan está ejecutando tu solicitud/)).not.toBeInTheDocument();
  });
  it('distingue una solicitud en cola de una que está ejecutándose',async()=>{
    API.get.mockResolvedValue({data:{...trabajo,estado:'pendiente',resultado:'',pasos:[],pasos_guardados:0,motor:{activo:true}}});
    mostrar(<EjecucionAgente id={12}/>);
    expect(await screen.findByText('Alan recibió la tarea y empieza en un momento.')).toBeInTheDocument();
    expect(screen.queryByText(/Alan está ejecutando tu solicitud/)).not.toBeInTheDocument();
  });
  it('muestra los registros verificados y sus enlaces también dentro del chat',async()=>{
    API.get.mockResolvedValue({data:trabajo});
    const {cache}=mostrar(<EjecucionAgente id={12} compacto/>);
    expect(await screen.findByText('Resultado verificado')).toBeInTheDocument();
    expect(screen.getByText('Venta guardada con sus productos.')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Venta #123/})).toHaveAttribute('href',trabajo.pasos[0].resultado.ventas[0].url);
    expect(screen.getByRole('link',{name:/Ver avance y resultado/})).toHaveAttribute('href','/IA?operacion=12');
    const query=cache.getQueryCache().find({queryKey:['trabajo-agente',12]});
    expect(query.getObserversCount()).toBe(1);
    // Una ejecución terminada deja de consultar periódicamente.
    expect(query.observers[0].options.refetchInterval(query)).toBe(false);
  });
  it('permite aportar datos y retoma la misma ejecución, sin ocultar un error',async()=>{
    let retomada=false;
    API.get.mockImplementation(async()=>({data:retomada?{...trabajo,estado:'pendiente',pasos:[],pasos_guardados:0,resultado:''}:
      {...trabajo,estado:'necesita_datos',pasos:[],pasos_guardados:0,resultado:'Indica el cliente y los productos.'}}));
    API.post.mockImplementation(async()=>{retomada=true;return {data:{}};});
    mostrar(<EjecucionAgente id={12}/>);
    expect(await screen.findByText('Necesita datos para continuar')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Datos para continuar'),{target:{value:'Cliente 7, dos mesas del catálogo.'}});
    fireEvent.click(screen.getByRole('button',{name:'Continuar con Alan'}));
    await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/agente/trabajos/12/',
      {accion:'retomar',datos_adicionales:'Cliente 7, dos mesas del catálogo.'}));
    expect(await screen.findByText('En cola')).toBeInTheDocument();
  });
  it('abre desde el historial la ejecución concreta del usuario',async()=>{
    API.get.mockResolvedValue({data:{trabajos:[{...trabajo,solicitud:'Registrar una venta completa'}]}});
    const abrir=vi.fn();mostrar(<EjecucionesAgente onAbrir={abrir}/>);
    fireEvent.click(await screen.findByRole('button',{name:/Ejecución #12/}));
    expect(abrir).toHaveBeenCalledWith(12);
  });
  it('retoma desde el mismo chat y muestra el identificador original de un enlace antiguo',async()=>{
    API.get.mockResolvedValue({data:{...trabajo,estado:'error',error:'Paso interrumpido',resultado:'',pasos:[],pasos_guardados:0}});
    API.post.mockResolvedValue({data:{}});
    mostrar(<EjecucionAgente id={15} compacto/>);
    expect(await screen.findByText('Alan · Ejecución #12')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Ver avance y resultado/})).toHaveAttribute('href','/IA?operacion=12');
    fireEvent.click(screen.getByRole('button',{name:'Continuar con Alan'}));
    await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/asistente/agente/trabajos/15/',{accion:'retomar',datos_adicionales:''}));
  });
  it('conserva el resultado conocido si falla una actualización de red',async()=>{
    API.get.mockRejectedValue(new Error('Red temporalmente indisponible'));
    mostrar(<EjecucionAgente id={12} inicial={trabajo} compacto/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Se conserva el último resultado');
    expect(screen.getByText('Resultado verificado')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Venta #123/})).toBeInTheDocument();
  });
});
