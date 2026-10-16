// Paseos de los personajes (2026-10-09): cada cierto tiempo alguien deja su puesto, camina
// por los pasillos hasta la zona social, se queda un rato y vuelve. Solo es ambientación:
// no cambia datos ni ubicaciones guardadas. Se desactiva con «reducir movimiento».
import {useEffect,useRef,useState} from 'react';
import {pasillos} from './distribucionOficina';

export const VELOCIDAD=42;
export const duracionPaso=(desde,hasta)=>Math.hypot(hasta.x-desde.x,hasta.y-desde.y)<1?0:Math.max(.6,Math.hypot(hasta.x-desde.x,hasta.y-desde.y)/VELOCIDAD);
export function puntoEnMovimiento(m,ahora=Date.now()){
    if(!m?.anterior||!m.duracion)return m?.punto;
    const avance=Math.max(0,Math.min(1,(ahora-m.iniciado)/(m.duracion*1000)));
    return {x:m.anterior.x+(m.punto.x-m.anterior.x)*avance,y:m.anterior.y+(m.punto.y-m.anterior.y)*avance};
}
const MAX_CAMINANDO=2;
const INTERVALO=18000;
const DESCANSO=[18000,28000];
const ENFRIAMIENTO=180000;

const vertical=pasillos[0],horizontal=pasillos[1];
const cx=vertical.x+vertical.w/2,hy=horizontal.y+horizontal.h/2;
const azar=([a,b])=>a+Math.random()*(b-a);

/** Ruta por pasillos (en coordenadas del plano) desde un punto hasta otro. */
export function ruta(desde,hasta){
    if(Math.hypot(desde.x-hasta.x,desde.y-hasta.y)<1)return [desde];
    const salida=p=>p.x>vertical.x?[{x:cx,y:p.y},{x:cx,y:hy}]:[{x:p.x,y:hy}];
    const puntos=[desde,...salida(desde),...salida(hasta).reverse(),hasta];
    return puntos.filter((p,i)=>i===0||Math.hypot(p.x-puntos[i-1].x,p.y-puntos[i-1].y)>1);
}

/** Lugares para sentarse o tomar café dentro de la zona social. */
export function lugaresSociales(espacio){
    if(!espacio)return [];
    const {x,y}=espacio;
    return [{x:x+75,y:y+62},{x:x+110,y:y+64},{x:x+145,y:y+62},{x:x+62,y:y+175},{x:x+154,y:y+178},{x:x+152,y:y+243},{x:x+52,y:y+258}];
}

const reducido=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * estaciones: [{clave, x, y, quieto}] con la posición del puesto (pies del personaje).
 * Devuelve {clave: {punto, duracion, fase, izquierda}} para quienes están de paseo.
 */
export function usePaseos(estaciones,lugares,activo=true){
    const [paseos,setPaseos]=useState({});
    const datos=useRef({estaciones,lugares}),temporizadores=useRef({}),ultimo=useRef({}),vivos=useRef({}),regresar=useRef(null);
    datos.current={estaciones,lugares};
    vivos.current=paseos;
    const bloqueados=estaciones.filter(e=>e.quieto).map(e=>`${e.clave}:${e.mision?'mision':'pausa'}`).sort().join(',');
    useEffect(()=>{
        const lista=datos.current.estaciones,claves=lista.filter(e=>e.quieto).map(e=>e.clave);
        claves.forEach(k=>clearTimeout(temporizadores.current[k]));
        setPaseos(p=>{
            if(!claves.some(k=>p[k]))return p;
            const n={...p};
            claves.forEach(k=>{
                if(lista.find(e=>e.clave===k)?.mision)delete n[k];
                else if(n[k])n[k]={...n[k],punto:puntoEnMovimiento(n[k]),duracion:0,fase:'pausa',texto:'Disponible para conversar aquí'};
            });
            return n;
        });
        Object.entries(vivos.current).filter(([k,p])=>p.fase==='pausa'&&!claves.includes(k)).forEach(([k,p])=>{
            const casa=lista.find(e=>e.clave===k);
            if(casa)regresar.current?.(k,p.punto,casa);
        });
    },[bloqueados]);

    useEffect(()=>{
        if(!activo||reducido())return undefined;
        const timers=temporizadores.current;
        const mover=(clave,puntos,i,fase,alTerminar)=>{
            if(i>=puntos.length){alTerminar();return;}
            const previo=puntos[i-1]||puntos[0],punto=puntos[i];
            const duracion=i===0?0:duracionPaso(previo,punto);
            // En pantalla la izquierda es donde baja la proyección isométrica (x - y).
            const izquierda=(punto.x-punto.y)<(previo.x-previo.y);
            setPaseos(p=>({...p,[clave]:{...p[clave],punto,anterior:previo,iniciado:Date.now(),duracion,fase,izquierda}}));
            timers[clave]=setTimeout(()=>mover(clave,puntos,i+1,fase,alTerminar),duracion*1000+40);
        };
        regresar.current=(clave,desde,casa)=>{
            setPaseos(p=>({...p,[clave]:{...p[clave],texto:'Volviendo a su puesto'}}));
            mover(clave,ruta(desde,casa),0,'vuelta',()=>setPaseos(p=>{const n={...p};delete n[clave];return n;}));
        };
        const salir=()=>{
            const {estaciones:lista,lugares:sitios}=datos.current,actuales=vivos.current;
            const fuera=Object.keys(actuales);
            if(!sitios.length||fuera.length>=MAX_CAMINANDO)return;
            const ahora=Date.now();
            const candidatos=lista.filter(e=>!e.quieto&&!fuera.includes(e.clave)&&ahora-(ultimo.current[e.clave]||0)>ENFRIAMIENTO);
            const ocupados=new Set(Object.values(actuales).map(p=>p.destino));
            const libres=sitios.map((_,i)=>i).filter(i=>!ocupados.has(i));
            if(!candidatos.length||!libres.length)return;
            const quien=candidatos[Math.floor(Math.random()*candidatos.length)];
            const sitio=libres[Math.floor(Math.random()*libres.length)];
            const visita=quien.visitas?.length&&Math.random()<.8?quien.visitas[Math.floor(Math.random()*quien.visitas.length)]:null;
            const clave=quien.clave,casa={x:quien.x,y:quien.y},ida=ruta(casa,visita||sitios[sitio]);
            const detalles=visita?{texto:visita.texto,tipo:'exploracion',zona:visita.nombre}:{texto:'Pausa en la zona social',tipo:'descanso'};
            ultimo.current[clave]=ahora;
            vivos.current={...actuales,[clave]:{punto:casa,duracion:0,fase:'ida',destino:sitio,izquierda:false,...detalles}};
            setPaseos(p=>({...p,[clave]:{punto:casa,duracion:0,fase:'ida',destino:sitio,izquierda:false,...detalles}}));
            timers[clave]=setTimeout(()=>mover(clave,ida,1,'ida',()=>{
                setPaseos(p=>p[clave]?{...p,[clave]:{...p[clave],fase:'visita',duracion:0}}:p);
                timers[clave]=setTimeout(()=>mover(clave,[...ida].reverse(),1,'vuelta',()=>{
                    setPaseos(p=>{const r={...p};delete r[clave];return r;});
                }),azar(DESCANSO));
            }),60);
        };
        const primero=setTimeout(()=>{if(Math.random()<.9)salir();},18000);
        const ciclo=setInterval(()=>{if(document.visibilityState==='visible'&&Math.random()<.55)salir();},INTERVALO);
        return ()=>{regresar.current=null;clearTimeout(primero);clearInterval(ciclo);Object.values(timers).forEach(clearTimeout);setPaseos({});};
    },[activo]);

    return paseos;
}
