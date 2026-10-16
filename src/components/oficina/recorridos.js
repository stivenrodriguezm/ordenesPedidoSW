import {useEffect,useRef,useState} from 'react';
import {ruta,duracionPaso,puntoEnMovimiento} from './paseos';

export const clavePersonaje=a=>`${a.esPersona?'persona':'ia'}-${a.id??'general'}`;

/** Cada personaje conserva su propia cola: no interrumpe ni teletransporta a otros. */
export function useRecorridos(eventos,estaciones,activo=true,previas={}){
    const [posiciones,setPosiciones]=useState({});
    const datos=useRef({estaciones,activo,previas}),vistos=useRef(new Set()),colas=useRef({}),
        ocupados=useRef(new Set()),timers=useRef({}),vivo=useRef(true),actuales=useRef({}),
        rumbo=useRef({}),esperas=useRef({});
    datos.current={estaciones,activo,previas};
    const claves=estaciones.map(e=>e.clave).sort().join(',');
    useEffect(()=>{
        vivo.current=true;
        const buscar=k=>datos.current.estaciones.find(e=>e.clave===k);
        const reducido=()=>!datos.current.activo||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const actualizar=(k,p)=>{
            actuales.current[k]=p.punto;
            setPosiciones(prev=>({...prev,[k]:p}));
        };
        const despues=(k,ms,fn)=>{timers.current[k]=setTimeout(()=>{if(vivo.current)fn();},ms);};
        const mover=(k,puntos,i,fase,e,fin)=>{
            if(!vivo.current)return;
            if(i>=puntos.length){fin();return;}
            const punto=puntos[i],previo=puntos[i-1]||punto;
            const duracion=reducido()?0:duracionPaso(previo,punto);
            actualizar(k,{punto,anterior:previo,iniciado:Date.now(),duracion,fase,texto:e.texto,destino:e.destino,tipo:e.tipo,
                izquierda:punto.x-punto.y<previo.x-previo.y});
            despues(k,duracion*1000+40,()=>mover(k,puntos,i+1,fase,e,fin));
        };
        const finalizar=k=>{
            ocupados.current.delete(k);delete actuales.current[k];delete rumbo.current[k];
            setPosiciones(p=>{const n={...p};delete n[k];return n;});
        };
        const siguiente=k=>{
            // Si alguien viene hacia este personaje (p. ej. IA Lottus a encargarle una tarea a
            // Alan), lo espera antes de arrancar: primero el «Por favor…», luego el trabajo.
            // También espera los encargos anteriores que siguen en la cola de quien viene
            // (p. ej. IA Lottus termina de analizar en su puesto y luego camina hasta Alan).
            const cabeza=colas.current[k]?.[0];
            const viene=!!cabeza&&(Object.entries(rumbo.current).some(([a,d])=>a!==k&&d===k)
                ||Object.entries(colas.current).some(([a,c])=>a!==k&&c.some(e=>e.destino===k&&e.id<cabeza.id)));
            if(viene&&(esperas.current[k]=(esperas.current[k]||0)+1)<=60){
                ocupados.current.add(k);despues(k,700,()=>siguiente(k));return;
            }
            esperas.current[k]=0;
            const origen=buscar(k),e=colas.current[k]?.shift();
            if(!origen){finalizar(k);return;}
            if(!e){
                const punto=actuales.current[k]||origen;
                mover(k,ruta(punto,origen),0,'vuelta',{texto:'Volviendo a su puesto',destino:k},()=>finalizar(k));
                return;
            }
            const destino=buscar(e.destino);
            if(!destino){siguiente(k);return;}
            ocupados.current.add(k);
            const ubicacion=puntoEnMovimiento(datos.current.previas[e.destino])||destino;
            const encuentro=e.destino===k?origen:{x:ubicacion.x-20,y:ubicacion.y+22};
            if(e.destino!==k)rumbo.current[k]=e.destino;
            mover(k,ruta(actuales.current[k]||puntoEnMovimiento(datos.current.previas[k])||origen,encuentro),0,'ida',e,()=>{
                delete rumbo.current[k];
                const fase=e.tipo==='trabajo'?'trabajo':e.tipo==='analisis'?'analisis':'visita';
                actualizar(k,{punto:encuentro,duracion:0,texto:e.texto,destino:e.destino,tipo:e.tipo,izquierda:false,fase});
                despues(k,reducido()?1000:e.tipo==='trabajo'?8000:e.tipo==='analisis'?12000:10000,()=>siguiente(k));
            });
        };
        for(const e of eventos){
            if(vistos.current.has(e.id)||!buscar(e.actor)||!buscar(e.destino))continue;
            vistos.current.add(e.id);
            if(Date.now()-Date.parse(e.creado)>300000)continue;
            (colas.current[e.actor]??=[]).push(e);
        }
        if(vistos.current.size>1500)vistos.current=new Set([...vistos.current].slice(-1000));
        Object.keys(colas.current).forEach(k=>{if(colas.current[k].length&&!ocupados.current.has(k))siguiente(k);});
    },[eventos,claves]);
    useEffect(()=>{
        vivo.current=true;
        const temporizadores=timers.current,ocupacion=ocupados.current;
        return()=>{vivo.current=false;Object.values(temporizadores).forEach(clearTimeout);colas.current={};ocupacion.clear();vistos.current.clear();actuales.current={};rumbo.current={};};
    },[]);
    return posiciones;
}
