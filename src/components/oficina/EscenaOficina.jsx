import React, {useRef} from 'react';
import { FaCoffee, FaEnvelope } from 'react-icons/fa';
import { COLORES } from '../chat/catalogoIA';
import FichaAgente from './FichaAgente';
import {ContenidoPersona} from './EquipoHumano';
import {actividadAgente,visitasEstrategicas} from './actividadAgente';
import {distribuirZonas,puestosZona,pasillos} from './distribucionOficina';
import {usePaseos,lugaresSociales} from './paseos';
import {useRecorridos,clavePersonaje} from './recorridos';
import {ubicarEtiquetas,nombreCorto} from './etiquetasOficina';

// Planta arquitectónica propia. Las personas y zonas usan los perfiles reales del ERP.
const proyectar = (x, y, z = 0) => [520 + (x - y) * 0.9, 114 + (x + y) * 0.34 - z];
const puntos = ps => ps.map(p => p.join(',')).join(' ');
const paletas = {
    estudio: ['#ded8cc', '#716657'], showroom: ['#e7e1d6', '#877760'],
    operaciones: ['#dcd8d0', '#746c61'], finanzas: ['#d5d3cb', '#575955'],
    gerencia:['#d1c7b2','#74664c'], oficina:['#dcd8cd','#797463'], tecnologia:['#cfd6d1','#617062'],
    creativo:['#e2d7c4','#8b7856'], social:['#ded9c8','#827758'], entrenamiento:['#d6ddcc','#657656'],
};
function Plano({ x, y, w, h, z = 0, fill, ...props }) {
    return <polygon points={puntos([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]].map(p => proyectar(...p)))} fill={fill} {...props} />;
}
function Cara({ vertices, ...props }) {
    return <polygon points={puntos(vertices.map(p => proyectar(...p)))} {...props} />;
}
function Trazo({ desde, hasta, ...props }) {
    const a = proyectar(...desde), b = proyectar(...hasta);
    return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...props} />;
}
function Caja({ x, y, w, h, z = 0, alto, color = '#b59a73', lado = '#78634a', frente = '#967d5c', suave = false }) {
    return <g strokeLinejoin="round" strokeWidth={suave ? 3 : 0}>
        <Cara vertices={[[x+w,y,z],[x+w,y+h,z],[x+w,y+h,z+alto],[x+w,y,z+alto]]} fill={lado} stroke={suave ? lado : 'none'} />
        <Cara vertices={[[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+alto],[x,y+h,z+alto]]} fill={frente} stroke={suave ? frente : 'none'} />
        <Plano x={x} y={y} w={w} h={h} z={z+alto} fill={color} stroke={suave ? color : 'none'} />
    </g>;
}
function Planta({ x, y, pequena = false }) {
    const [px,py] = proyectar(x,y, pequena ? 28 : 38);
    return <g>
        <Caja x={x-8} y={y-8} w={16} h={16} alto={pequena ? 15 : 21} color="#4a4b42" frente="#36382f" lado="#272a25" />
        <path d={`M${px} ${py+18}v-37`} stroke="#565d3e" strokeWidth="1.8" />
        {[-1,1].map((s,i)=><g key={s}>
            <ellipse cx={px+s*9} cy={py-6-i*13} rx="5" ry={pequena ? 11 : 16} fill={i ? '#6f7750' : '#535e42'} transform={`rotate(${s*38} ${px+s*9} ${py-6-i*13})`} />
            <ellipse cx={px+s*7} cy={py+9-i*10} rx="4" ry="12" fill="#828865" transform={`rotate(${s*53} ${px+s*7} ${py+9-i*10})`} />
        </g>)}
        <ellipse cx={px} cy={py-26} rx="4" ry={pequena ? 10 : 14} fill="#616d49" />
    </g>;
}
function MesaRedonda({ x, y, radio = 25, alto = 22 }) {
    const [px,py] = proyectar(x,y,alto);
    const [bx,by] = proyectar(x,y,3);
    return <g>
        <ellipse cx={bx} cy={by} rx={radio*.7} ry={radio*.32} fill="#262622" opacity=".13" />
        <path d={`M${px-5} ${py+1}l-2 ${alto-3}h15l-2 -${alto-3}`} fill="#343430" />
        <path d={`M${px-radio} ${py}v3a${radio} ${radio*.51} 0 0 0 ${radio*2} 0v-3`} fill="#847c6d" />
        <ellipse cx={px} cy={py} rx={radio} ry={radio*.51} fill="url(#of-piedra)" stroke="#eeeae1" strokeWidth=".8" />
        <ellipse cx={px+5} cy={py-2} rx="7" ry="3.5" fill="#383830" />
        <ellipse cx={px+5} cy={py-4} rx="6" ry="3" fill="#bca981" />
    </g>;
}
function Silla({ x, y }) {
    const [px,py] = proyectar(x+10,y+12,5);
    return <g>
        <path d={`M${px-14} ${py+5}l14-6 15 7m-15-7v13m0-13 9-8m-9 8-9-7`} stroke="#444540" strokeWidth="2" fill="none" />
        <Caja x={x} y={y} w={23} h={23} z={19} alto={4} color="#595951" lado="#262724" frente="#3b3d37" suave />
        <Caja x={x} y={y+21} w={23} h={4} z={22} alto={23} color="#64635b" lado="#292b26" frente="#41443c" suave />
        <Trazo desde={[x+4,y+26,31]} hasta={[x+19,y+26,31]} stroke="#72746a" strokeWidth=".6" />
    </g>;
}
function Escritorio({ x, y }) {
    return <g data-mueble="escritorio">
        <Plano x={x-43} y={y-38} w={98} h={79} fill="#151512" opacity=".065" />
        {[-36,37].map(dx=><g key={dx}>
            {[-33,5].map(dy=><Caja key={dy} x={x+dx} y={y+dy} w={3} h={3} alto={35} color="#3d3d36" lado="#1a1b18" frente="#292b25" />)}
            <Trazo desde={[x+dx,y-33,1]} hasta={[x+dx,y+8,1]} stroke="#393a33" strokeWidth="2" />
            <Trazo desde={[x+dx,y-33,34]} hasta={[x+dx,y+8,34]} stroke="#393a33" strokeWidth="2" />
        </g>)}
        <Caja x={x-43} y={y-39} w={91} h={49} z={35} alto={3} color="url(#of-roble)" lado="#82704f" frente="#b29971" />
        {[0,1,2,3].map(i=><Trazo key={i} desde={[x-40,y-31+i*9,38.5]} hasta={[x+43,y-31+i*9,38.5]} stroke="#80633f" strokeWidth=".5" opacity=".16" />)}
        <Caja x={x+2} y={y-24} w={17} h={9} z={38} alto={1} color="#4c4c43" frente="#23241f" lado="#292a25" />
        <Caja x={x+9} y={y-25} w={3} h={2} z={39} alto={5} color="#41423a" frente="#292b25" />
        <Caja x={x-7} y={y-29} w={36} h={2} z={44} alto={23} color="#454840" lado="#1b1e19" frente="#30372f" />
        <Cara vertices={[[x-5,y-26.9,46],[x+27,y-26.9,46],[x+27,y-26.9,64],[x-5,y-26.9,64]]} fill="url(#of-pantalla)" />
        <Trazo desde={[x-1,y-26.8,60]} hasta={[x+15,y-26.8,60]} stroke="#a9aa92" strokeWidth="1" opacity=".7" />
        <Trazo desde={[x-1,y-26.8,56]} hasta={[x+22,y-26.8,56]} stroke="#747e70" strokeWidth=".8" />
        <Plano x={x-3} y={y-13} w={28} h={8} z={39} fill="#494b42" />
        {[0,1,2].map(i=><Trazo key={i} desde={[x,y-11+i*2,39.1]} hasta={[x+21,y-11+i*2,39.1]} stroke="#808174" strokeWidth=".5" />)}
        <Plano x={x-32} y={y-22} w={18} h={21} z={38.5} fill="#efece4" stroke="#c9c1b0" strokeWidth=".5" />
        <Plano x={x-29} y={y-19} w={12} h={7} z={39} fill="#c6b39a" />
        <Trazo desde={[x-28,y-7,39]} hasta={[x-19,y-7,39]} stroke="#999484" strokeWidth="1" />
        <Silla x={x-8} y={y+15} />
    </g>;
}
function Sofa({ x, y }) {
    return <g data-mueble="sofa" data-plazas="3">
        <Plano x={x-9} y={y-7} w={155} h={83} fill="#a19884" opacity=".17" />
        {[[5,8],[119,8],[5,46],[119,46]].map(([dx,dy],i)=><Caja key={i} x={x+dx} y={y+dy} w={3} h={3} alto={7} color="#353831" lado="#22241f" frente="#2f302a" />)}
        <Caja x={x} y={y} w={132} h={51} z={7} alto={11} color="#b6af9f" lado="#958e7e" frente="#aaa391" suave />
        <Caja x={x+3} y={y+1} w={126} h={11} z={18} alto={27} color="url(#of-tapizado)" lado="#a29b8a" frente="#c5beae" suave />
        {[0,1,2].map(i=><g key={i}>
            <Caja x={x+13+i*35} y={y+15} w={33} h={32} z={18} alto={6} color="#dfd9cb" lado="#b6af9e" frente="#cbc3b2" suave />
            <Trazo desde={[x+15+i*35,y+47,21]} hasta={[x+43+i*35,y+47,21]} stroke="#ede8df" strokeWidth=".65" />
        </g>)}
        <Caja x={x-2} y={y+1} w={12} h={51} z={14} alto={20} color="#e1dacb" frente="#c7bfae" lado="#b5ab99" suave />
        <Caja x={x+122} y={y+1} w={12} h={51} z={14} alto={20} color="#dfd8c9" frente="#c7bfae" lado="#aaa08f" suave />
        {[['#86735b','#a28e71',17],['#c9bea7','#ded5c1',92]].map(([f,c,dx],i)=><Caja key={i} x={x+dx} y={y+13} w={20} h={7} z={24} alto={17} color={c} frente={f} lado="#a3957c" suave />)}
        <MesaRedonda x={x+59} y={y+80} radio={24} alto={20} />
    </g>;
}
function Sillon({x,y}) {
    return <g data-mueble="sillon-descanso">
        <Plano x={x-4} y={y-3} w={53} h={48} fill="#716b54" opacity=".12"/>
        <Caja x={x} y={y} w={44} h={35} z={7} alto={12} color="#c8bfaa" frente="#a89d86" lado="#8a816c" suave/>
        <Caja x={x+2} y={y+2} w={40} h={8} z={19} alto={22} color="url(#of-tapizado)" frente="#b9b19d" lado="#a09883" suave/>
        <Caja x={x+7} y={y+12} w={30} h={22} z={19} alto={5} color="#e4dccb" frente="#c5bba5" lado="#b1a58b" suave/>
        {[0,38].map(dx=><Caja key={dx} x={x+dx} y={y+8} w={6} h={29} z={17} alto={13} color="#d4cab5" frente="#b9ad94" lado="#a69b83" suave/>)}
    </g>;
}
function Cafetera({x,y}) {
    return <g data-mueble="cafetera">
        <Caja x={x} y={y} w={68} h={27} alto={35} color="url(#of-roble)" frente="#b29b74" lado="#7d6d51"/>
        <Caja x={x} y={y} w={68} h={27} z={35} alto={3} color="#ddd6c3" frente="#b4ac95" lado="#827963"/>
        <Caja x={x+31} y={y+4} w={25} h={19} z={38} alto={26} color="#525548" frente="#33392c" lado="#242a20"/>
        <Cara vertices={[[x+33,y+23.1,55],[x+54,y+23.1,55],[x+54,y+23.1,61],[x+33,y+23.1,61]]} fill="#bfb7a0"/>
        <Trazo desde={[x+43,y+24,55]} hasta={[x+43,y+26,49]} stroke="#d1ccb9" strokeWidth="2"/>
        <Caja x={x+34} y={y+18} w={19} h={7} z={38} alto={2} color="#7a7c6b" frente="#444d39"/>
        <Caja x={x+40} y={y+19} w={7} h={6} z={40} alto={6} color="#fff9e9" frente="#d9d1be" lado="#b6ae94"/>
        <Caja x={x+9} y={y+8} w={10} h={9} z={38} alto={7} color="#f7f0dd" frente="#c8bfa9"/>
    </g>;
}
function TableroAcademia({x,y,onAbrir}) {
    return <g className={`of-tablero-academia${onAbrir?' is-interactivo':''}`} data-mueble="tablero-academia"
        role={onAbrir?'button':undefined} tabIndex={onAbrir?0:undefined} aria-label={onAbrir?'Abrir Academia Lottus':undefined}
        onClick={onAbrir} onKeyDown={onAbrir?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onAbrir();}}:undefined}>
        <title>{onAbrir?'Abrir Academia Lottus':'LOTTUS ACADEMIA'}</title>
        <Caja x={x+14} y={y+26} w={5} h={134} z={22} alto={64} color="#474c3e" frente="#20261c" lado="#343c2c"/>
        <Cara vertices={[[x+19.2,y+32,29],[x+19.2,y+154,29],[x+19.2,y+154,79],[x+19.2,y+32,79]]} className="of-tablero-academia__cara" fill="#eff0df" stroke="#b6a879" strokeWidth="1"/>
        <text transform={`matrix(.9 -.34 0 1 ${proyectar(x+19.4,y+146,65).join(' ')})`} fontSize="9" fill="#424d32" letterSpacing="1">LOTTUS ACADEMIA</text>
        {[0,1,2].map(i=><Trazo key={i} desde={[x+19.5,y+144,49-i*7]} hasta={[x+19.5,y+52+i*15,49-i*7]} stroke={i===0?'#ac966a':'#a4ae91'} strokeWidth="2"/>)}
    </g>;
}
function Muebles({ ambiente, x, y, onAcademia }) {
    if (ambiente === 'gerencia') return <g>
        <Muebles ambiente="finanzas" x={x} y={y}/>
        <Cara vertices={[[x+151,y+14,46],[x+192,y+14,46],[x+192,y+14,80],[x+151,y+14,80]]} fill="#373d31" stroke="#ad9c79" strokeWidth="2"/>
        <Cara vertices={[[x+158,y+14.2,53],[x+185,y+14.2,53],[x+185,y+14.2,73],[x+158,y+14.2,73]]} fill="#bcad86"/>
        <Trazo desde={[x+160,y+14.3,55]} hasta={[x+183,y+14.3,70]} stroke="#e0d4b4" strokeWidth="2"/>
    </g>;
    if (ambiente === 'oficina') return <g>
        <Muebles ambiente="finanzas" x={x} y={y}/>
        <Caja x={x+162} y={y+15} w={40} h={22} z={41} alto={13} color="#ece9df" frente="#d0cbbb" lado="#9fa08e"/>
        <Plano x={x+166} y={y+17} w={30} h={14} z={54} fill="#41473b"/>
        <Caja x={x+169} y={y+31} w={22} h={10} z={43} alto={1} color="#f6f4ea" frente="#d9d5c7"/>
        <Planta x={x+250} y={y+26} pequena/>
    </g>;
    if (ambiente === 'tecnologia') return <g>
        <Caja x={x+153} y={y+11} w={48} h={34} alto={68} color="#4b5247" frente="#323b30" lado="#242d23"/>
        {[0,1,2,3,4,5].map(i=><g key={i}>
            <Cara vertices={[[x+157,y+45.1,9+i*9],[x+197,y+45.1,9+i*9],[x+197,y+45.1,15+i*9],[x+157,y+45.1,15+i*9]]} fill="#5c6556"/>
            <Trazo desde={[x+160,y+45.2,12+i*9]} hasta={[x+188,y+45.2,12+i*9]} stroke="#89917d" strokeWidth=".7"/>
        </g>)}
        <Caja x={x+215} y={y+14} w={47} h={29} alto={35} color="url(#of-roble)" frente="#a48b68" lado="#796548"/>
        <Caja x={x+220} y={y+16} w={37} h={3} z={39} alto={26} color="#3e4939" frente="#3e4939" lado="#242d21"/>
        {[0,1,2].map(i=><Trazo key={i} desde={[x+224,y+19.1,47+i*5]} hasta={[x+251-i*4,y+19.1,47+i*5]} stroke="#a2b29b" strokeWidth="1"/>)}
    </g>;
    if (ambiente === 'social') return <g>
        <Sofa x={x+40} y={y+17}/>
        <Cafetera x={x+16} y={y+218}/>
        {puestosZona('social').map(([dx,dy],i)=><Sillon key={i} x={x+dx} y={y+dy}/>)}
        <Planta x={x+191} y={y+70}/>
    </g>;
    if (ambiente === 'entrenamiento') return <g>
        <TableroAcademia x={x} y={y} onAbrir={onAcademia}/>
        {[145,188,231].flatMap(dy=>[45,132].map(dx=><Silla key={`${dx}-${dy}`} x={x+dx} y={y+dy}/>))}
        <Planta x={x+197} y={y+28} pequena/>
    </g>;
    if (ambiente === 'creativo') return <g>
        <Muebles ambiente="estudio" x={x} y={y}/>
        <Plano x={x+138} y={y+65} w={69} h={34} z={23} fill="url(#of-roble)" stroke="#9a825c" strokeWidth="1"/>
        <Plano x={x+149} y={y+68} w={47} h={26} z={24} fill="#f3ede0"/>
        <Plano x={x+156} y={y+74} w={32} h={13} z={24.1} fill="none" stroke="#a5a48b" strokeWidth=".8"/>
        {[0,1,2].map(i=><Trazo key={i} desde={[x+158+i*9,y+74,24.2]} hasta={[x+158+i*9,y+87,24.2]} stroke="#b9b598" strokeWidth=".8"/>)}
        <Trazo desde={[x+143,y+69,22]} hasta={[x+143,y+69,0]} stroke="#6d6e57" strokeWidth="2"/>
        <Trazo desde={[x+202,y+94,22]} hasta={[x+202,y+94,0]} stroke="#6d6e57" strokeWidth="2"/>
    </g>;
    if (ambiente === 'showroom') return <g><Planta x={x+28} y={y+34}/><Planta x={x+231} y={y+450}/></g>;
    if (ambiente === 'operaciones') return <g>
        <Caja x={x+148} y={y+13} w={115} h={36} alto={36} color="url(#of-roble)" frente="#b49a74" lado="#6b5c47" />
        <Caja x={x+148} y={y+13} w={115} h={36} z={36} alto={2} color="#363b31" frente="#2f322a" lado="#1c201b" />
        {[[157,15,37,24],[205,19,38,32]].map(([dx,dy,w,alto],i)=><g key={i}>
            <Caja x={x+dx} y={y+dy} w={w} h={26} z={38} alto={alto} color="#c9af85" frente="#b69a70" lado="#91764f" />
            <Plano x={x+dx+w/2-2} y={y+dy} w={4} h={26} z={38+alto} fill="#8d7857" />
            <Cara vertices={[[x+dx+6,y+dy+26.1,43],[x+dx+19,y+dy+26.1,43],[x+dx+19,y+dy+26.1,51],[x+dx+6,y+dy+26.1,51]]} fill="#eee8d8" />
        </g>)}
        <Trazo desde={[x+162,y+49.1,12]} hasta={[x+162,y+49.1,30]} stroke="#806849" />
        <Trazo desde={[x+210,y+49.1,12]} hasta={[x+210,y+49.1,30]} stroke="#806849" />
    </g>;
    if (ambiente === 'finanzas') return <g>
        <Caja x={x+145} y={y+14} w={116} h={27} alto={40} color="#5a5a4e" frente="#414339" lado="#2a2e26" />
        {[0,1,2].map(i=><g key={i}>
            <Trazo desde={[x+181+i*35,y+41.1,5]} hasta={[x+181+i*35,y+41.1,38]} stroke="#727363" strokeWidth=".7" />
            <Trazo desde={[x+160+i*35,y+41.1,25]} hasta={[x+168+i*35,y+41.1,25]} stroke="#b7a77e" strokeWidth="1.4" />
        </g>)}
        <Plano x={x+159} y={y+21} w={37} h={14} z={40.5} fill="#d6ccb5" />
        {[0,1,2].map(i=><Caja key={i} x={x+217+i*8} y={y+20} w={6} h={13} z={40} alto={17+i%2*3} color={i===1?'#a29578':'#696c5b'} frente={i===1?'#a29578':'#696c5b'} lado="#414539" />)}
        <MesaRedonda x={x+166} y={y+74} radio={19} alto={24} />
    </g>;
    return <g>
        <Caja x={x+145} y={y+14} w={116} h={27} alto={38} color="url(#of-roble)" frente="#b69d77" lado="#746246" />
        {[0,1,2,3,4,5,6,7,8,9].map(i=><Trazo key={i} desde={[x+150+i*11,y+41.2,4]} hasta={[x+150+i*11,y+41.2,35]} stroke="#816c4c" strokeWidth="1" opacity=".6" />)}
        <Cara vertices={[[x+154,y+16,39],[x+254,y+16,39],[x+254,y+16,86],[x+154,y+16,86]]} fill="#3c3f34" stroke="#b6a276" strokeWidth="1.5" />
        {['#d1c6ad','#8d846d','#bba587','#717764','#dad5c8'].map((c,i)=><Cara key={c} vertices={[[x+163+i*17,y+16.5,52],[x+176+i*17,y+16.5,52],[x+176+i*17,y+16.5,71],[x+163+i*17,y+16.5,71]]} fill={c} />)}
        <Plano x={x+164} y={y+24} w={29} h={14} z={38.5} fill="#efeadd" />
        <Caja x={x+217} y={y+24} w={25} h={13} z={38} alto={2} color="#a09274" frente="#8c7d61" lado="#665d48" />
    </g>;
}
export function Personaje({ color = '#8f826b', semilla = 0, activo = false }) {
    const piel = ['#d4ae8c','#b48769','#e0bb96','#bd9476'][semilla%4];
    const chaqueta = semilla%2 ? '#5b5c50' : '#373b35';
    // Piezas separadas (piernas, brazos, cuerpo) para animar el paso, la respiración y el tecleo.
    return <svg viewBox="0 0 70 90" className={`of-personaje${activo?' is-trabajando':''}`} aria-hidden="true" style={{'--of-desfase':`${-(semilla*0.73)%3}s`}}>
        <ellipse className="of-p-sombra" cx="35" cy="84" rx="15" ry="4" fill="#282c22" opacity=".17" />
        <g className="of-p-figura">
            <g className="of-p-pierna of-p-pierna--izq"><path d="M29 57l-1 23" stroke="#46483f" strokeWidth="7" strokeLinecap="round" /><path d="M27 79l-5 4h10" stroke="#252922" strokeWidth="3.5" strokeLinecap="round" /></g>
            <g className="of-p-pierna of-p-pierna--der"><path d="M41 57l1 23" stroke="#46483f" strokeWidth="7" strokeLinecap="round" /><path d="M41 79l6 4H37" stroke="#252922" strokeWidth="3.5" strokeLinecap="round" /></g>
            <g className="of-p-cuerpo">
                <g className="of-p-brazo of-p-brazo--izq"><path d="M27 35l-5 15 3 11" fill="none" stroke={chaqueta} strokeWidth="6" strokeLinecap="round" /><path d="M25 60v3" stroke={piel} strokeWidth="4" strokeLinecap="round" /></g>
                <path d="M27 32q8-4 16 0l4 28q-12 4-24 0z" fill={chaqueta} />
                <path d="M31 31l4 18 5-18" fill="#e5dfcf" />
                <g className="of-p-brazo of-p-brazo--der"><path d="M43 35l6 15-3 11" fill="none" stroke={chaqueta} strokeWidth="6" strokeLinecap="round" /><path d="M46 60v3" stroke={piel} strokeWidth="4" strokeLinecap="round" /></g>
                <path d="M31 26v7l4 4 4-4v-7" fill={piel} />
                <g className="of-p-cabeza">
                    <ellipse cx="35" cy="19" rx="9" ry="11" fill={piel} />
                    <path d={semilla%2?'M26 23q-7-19 9-20 16 0 10 23l-4-13q-8 3-13 0z':'M26 19q-3-16 11-16 12 2 7 18l-3-9q-8 4-12 0z'} fill="#383930" />
                    <path d="M32 24h4" stroke="#a58061" strokeWidth=".8" strokeLinecap="round" />
                </g>
                <path d="M29 34l2 9 4 5 6-14" fill="none" stroke="#9a9784" strokeWidth=".65" />
                <rect x="34" y="43" width="5" height="7" rx=".6" fill="#dad5c7" />
                <rect x="35" y="44" width="3" height="2" fill={color} />
            </g>
        </g>
    </svg>;
}
function Arquitectura() {
    return <g>
        <ellipse cx="766" cy="519" rx="650" ry="120" fill="#302f27" opacity=".14" filter="url(#of-sombra)" />
        <Caja x={0} y={0} w={1060} h={545} z={-16} alto={16} color="#eeece4" frente="#57584c" lado="#35382e" />
        <Plano x={0} y={0} w={1060} h={545} fill="url(#of-pavimento)" />
        {Array.from({length:11},(_,i)=>(i+1)*80).map(x=><Trazo key={x} desde={[x,0,.1]} hasta={[x,545,.1]} stroke="#c9c6ba" strokeWidth=".65" opacity=".65" />)}
        {[80,160,240,320,400,480].map(y=><Trazo key={y} desde={[0,y,.1]} hasta={[1060,y,.1]} stroke="#c9c6ba" strokeWidth=".65" opacity=".65" />)}
        <Caja x={0} y={0} w={1060} h={7} alto={96} color="#242424" frente="#151515" lado="#111111" />
        <Caja x={0} y={7} w={7} h={538} alto={96} color="#272b23" frente="#262a22" lado="#d6d3c9" />
        {Array.from({length:24},(_,i)=><Caja key={i} x={30+i*11} y={7.2} w={5} h={2} z={9} alto={80} color="#947b55" lado="#635235" frente={i%3===0?'#b49a72':'#9f855e'} />)}
        <Trazo desde={[318,7.5,14]} hasta={[1045,7.5,14]} stroke="#d5b478" strokeWidth="1.3" />
        <Trazo desde={[13,536,1]} hasta={[1045,536,1]} stroke="#b4a58a" strokeWidth="1" />
        <text transform={`matrix(.9 .34 0 1 ${proyectar(720,8,51).join(' ')})`} fontFamily="Audiowide, sans-serif" fontSize="28" fontWeight="400" letterSpacing="3.5" fill="#fff">LOTTUS</text>
        <text transform={`matrix(.9 .34 0 1 ${proyectar(723,8,32).join(' ')})`} fontSize="6.5" letterSpacing="3" fill="#bfb7a4">ESTUDIO DE INTELIGENCIA</text>
        {[36,183,330].map(y=><g key={y}>
            <Cara vertices={[[8,y,14],[8,y+135,14],[8,y+135,87],[8,y,87]]} fill="url(#of-vidrio)" stroke="#4b5144" strokeWidth="2" />
            <Trazo desde={[8.1,y+65,14]} hasta={[8.1,y+65,87]} stroke="#6b705f" strokeWidth="1.2" />
            <Trazo desde={[8.2,y+4,79]} hasta={[8.2,y+116,27]} stroke="#fff" strokeWidth="8" opacity=".13" />
            <Trazo desde={[8.2,y+13,85]} hasta={[8.2,y+125,33]} stroke="#fff" strokeWidth="2" opacity=".2" />
        </g>)}
        <Plano x={12} y={13} w={305} h={19} fill="#b7ab8f" opacity=".08" />

    </g>;
}
const quieto=(a,trabajando)=>trabajando||(a.esPersona&&a.estado==='ocupado');

export default function EscenaOficina({ zonas, agentes, actividad, seleccion, paginaPuestos = 0, onAgente, onZona, onCrear, puedeGestionar, programacion, puedeProgramar, onProgramar, onResultado, onAcademia, onPersona, yo = null, mensajesSinLeer = 0, vuelos = [], eventos = [], zoom = 1, animar = true }) {
    const distribuidas=distribuirZonas(zonas);
    // Primero se calcula qué hay en cada zona; así los paseos y las etiquetas conocen los puestos.
    const zonasPlano=distribuidas.map(z=>{
        const {x,y,w,h}=z.espacio;
        const ambiente=z.ambiente==='tecnologia'?'entrenamiento':z.ambiente;
        const lista=agentes.filter(a=>a.zona===z.id),puestos=puestosZona(ambiente,w);
        const humanos=lista.filter(a=>a.esPersona&&a.puesto!=null&&puestos[a.puesto]);
        const libres=puestos.map((_,i)=>i).filter(i=>!humanos.some(a=>a.puesto===i));
        const bots=lista.filter(a=>!a.esPersona),capacidad=Math.max(1,libres.length);
        const grupo=Math.max(0,Math.min(paginaPuestos,Math.ceil(bots.length/capacidad)-1));
        const visibles=[...humanos,...bots.slice(grupo*capacidad,grupo*capacidad+capacidad).map((a,j)=>({...a,puesto:libres[j]}))];
        return {z,x,y,w,h,ambiente,puestos,visibles};
    });
    const estaciones=zonasPlano.flatMap(({x,y,puestos,visibles})=>visibles.filter(a=>puestos[a.puesto]).map(a=>({a,x:x+puestos[a.puesto][0],y:y+puestos[a.puesto][1]})));
    const clave=clavePersonaje;
    const social=distribuidas.find(z=>z.ambiente==='social');
    const posicionesPrevias=useRef({});
    const recorridos=useRecorridos(eventos,[...estaciones.map(({a,x,y})=>({clave:clave(a),x:x+3,y:y+26})),...zonasPlano.map(({z,x,y,w,h})=>({clave:`zona-${z.id}`,x:x+w/2,y:y+h-48}))],animar,posicionesPrevias.current);
    const misiones=new Set([...Object.keys(recorridos),...Object.values(recorridos).map(m=>m.destino)]);
    const ambientacion=usePaseos(estaciones.map(({a,x,y})=>({clave:clave(a),x:x+3,y:y+26,mision:!!recorridos[clave(a)],visitas:visitasEstrategicas(a,zonasPlano),quieto:misiones.has(clave(a))||quieto(a,!a.esPersona&&(actividad.has(a.id)||actividadAgente(programacion,a).compartido||actividadAgente(programacion,a).cursos.length>0))||(a.esPersona&&!a.en_oficina)})),lugaresSociales(social?.espacio),animar);
    const paseos={...ambientacion,...recorridos};
    posicionesPrevias.current=paseos;
    const textoZona=z=>{const n=agentes.filter(a=>a.zona===z.id).length;return n===0?(puedeGestionar?'+ Ubicar un agente':'Zona disponible'):`${n} ${n===1?'puesto activo':'puestos activos'}`;};
    const chips=distribuidas.map(z=>{const {x,y,w,h}=z.espacio;const [px,py]=proyectar(x+w*.75,y+h-23);return {z,px,py,texto:textoZona(z)};});
    const etiquetas=ubicarEtiquetas(estaciones.map(({a,x,y})=>{const [px,py]=proyectar(x+3,y+26);return {clave:clave(a),px,py,texto:nombreCorto(a.nombre),extra:a.esPersona?0:(actividadAgente(programacion,a).pendientes.length?18:0)};}),zoom,chips);
    const posicionPersona=id=>{const e=estaciones.find(({a})=>a.esPersona&&a.id===id);if(!e)return null;const p=paseos[clave(e.a)]?.punto||{x:e.x+3,y:e.y+26};const [px,py]=proyectar(p.x,p.y);return {left:px/16.5,top:py/7.1};};
    return <div className="of-escena" aria-label="Oficina virtual de agentes LOTTUS">
        <svg viewBox="0 0 1650 710" className="of-planta" aria-hidden={onAcademia?undefined:true}>
            <defs>
                <linearGradient id="of-roble" x2=".85" y2="1"><stop stopColor="#ceb68d" /><stop offset=".5" stopColor="#baa079" /><stop offset="1" stopColor="#ad9066" /></linearGradient>
                <linearGradient id="of-piedra" x2=".8" y2="1"><stop stopColor="#ece8de" /><stop offset="1" stopColor="#cbc6b7" /></linearGradient>
                <linearGradient id="of-tapizado" x2="0" y2="1"><stop stopColor="#e8e1d4" /><stop offset="1" stopColor="#c6bead" /></linearGradient>
                <linearGradient id="of-vidrio" x2="1" y2="1"><stop stopColor="#f4f3e9" /><stop offset=".5" stopColor="#c6cbc1" /><stop offset="1" stopColor="#a7b2a6" /></linearGradient>
                <linearGradient id="of-pantalla" x2="0" y2="1"><stop stopColor="#26352c" /><stop offset="1" stopColor="#485244" /></linearGradient>
                <pattern id="of-pavimento" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#e7e5dc" /><path d="M0 3h3m7 8h1m-7 4h2m8-11h2" stroke="#cfcabd" strokeWidth=".4" opacity=".6" /></pattern>
                <pattern id="of-trama" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0h5M0 3h5M1 0v5M4 0v5" stroke="#8b826f" strokeWidth=".4" opacity=".1" /></pattern>
                <filter id="of-sombra" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="12" /></filter>
            </defs>
            <Arquitectura />
            {pasillos.map((p,i)=><g key={i} data-pasillo={i} data-ancho={Math.min(p.w,p.h)}><Plano {...p} z={.15} fill="#f4f1e7"/><Plano x={p.x+3} y={p.y+3} w={p.w-6} h={p.h-6} z={.2} fill="none" stroke="#c9bda1" strokeWidth=".6"/></g>)}
            {zonasPlano.map(({z,x,y,w,h,ambiente,puestos})=>{
                const [suelo,acento]=paletas[ambiente]||paletas.estudio;
                const [tx,ty]=proyectar(x+12,y+h-12,1);
                const estrecha=w<270 && !['social','entrenamiento','showroom'].includes(ambiente);
                return <g key={z.id} data-area={z.nombre} data-superficie={w*h} opacity={seleccion && seleccion!==String(z.id)?'.24':1}>
                    <Plano x={x+2} y={y+3} w={w-4} h={h-4} fill="#35362c" opacity=".09"/>
                    <Plano x={x+2} y={y+2} w={w-4} h={h-4} z={.5} fill={suelo}/>
                    <Plano x={x+2} y={y+2} w={w-4} h={h-4} z={.6} fill="url(#of-trama)"/>
                    <Plano x={x+5} y={y+5} w={w-10} h={h-10} z={.7} fill="none" stroke="#fff" strokeWidth=".7" strokeOpacity=".65"/>
                    <Muebles ambiente={ambiente} x={estrecha?x-75:x} y={y} onAcademia={onAcademia}/>
                    {!['social','showroom','entrenamiento'].includes(ambiente)&&<Planta x={x+27} y={y+24}/>}
                    {ambiente!=='social'&&puestos.map(([dx,dy],j)=><Escritorio key={j} x={x+dx} y={y+dy}/>)}
                    <text x={tx} y={ty} transform={`rotate(20.7 ${tx} ${ty})`} fill={acento} fontSize={w<250?11:12} fontWeight="600" letterSpacing=".8">{z.nombre.slice(0,29)}</text>
                </g>;
            })}

        </svg>
        {estaciones.map(({a,x,y})=>{
            const k=clave(a),paseo=paseos[k];
            const [px,py]=paseo?proyectar(paseo.punto.x,paseo.punto.y):proyectar(x+3,y+26);
            const info=a.esPersona?{pendientes:[]}:actividadAgente(programacion,a);
            const trabajando=a.esPersona?a.estado==='ocupado':actividad.has(a.id)||info.compartido||info.cursos?.length>0;
            const caminando=paseo&&['ida','vuelta'].includes(paseo.fase);
            const etiqueta=paseo?{lado:'abajo',dx:0}:etiquetas[k]||{lado:'abajo',dx:0};
            const esYo=a.esPersona&&yo!=null&&a.id===yo;
            const sobres=esYo?mensajesSinLeer:a.esPersona?a.mensajes_para_mi||0:0;
            return <FichaAgente key={k} agente={a} info={info} trabajando={trabajando} puedeProgramar={puedeProgramar}
                movimiento={paseo} zonaNombre={zonas.find(z=>z.id===a.zona)?.nombre}
                onConversar={onAgente} onProgramar={onProgramar} onResultado={onResultado} contenidoFicha={a.esPersona?<ContenidoPersona persona={a} zonaNombre={zonas.find(z=>z.id===a.zona)?.nombre} movimiento={paseo} onAbrir={onPersona}/>:null}
                className={`of-puesto is-etiqueta-${etiqueta.lado}${seleccion && String(a.zona)!==seleccion?' is-atenuado':''}${caminando?' is-caminando':''}${paseo?.fase==='visita'?' is-de-visita':''}${paseo?.izquierda?' is-izquierda':''}${paseo?' is-paseando':''}`}
                style={{left:`${px/16.5}%`,top:`${py/7.1}%`,zIndex:3+Math.round(py/90),'--of-paso':`${paseo?.duracion||0}s`,'--etiqueta-dx':`${etiqueta.dx}px`,'--agente-color':COLORES[a.color]?.valor||'#8f826b'}}>
                {(id,abierta)=><><button type="button" className={`of-estacion${trabajando&&!a.esPersona?' is-activa':''}`} onClick={()=>a.esPersona?onPersona(a):onAgente(a)}
                    aria-label={`${a.esPersona?'Abrir oficina de':'Conversar con'} ${a.nombre}`} aria-describedby={abierta?id:undefined} title={a.nombre}>
                <Personaje color={COLORES[a.color]?.valor} semilla={a.id||0} activo={!caminando&&(trabajando||['trabajo','analisis'].includes(paseo?.fase))} />
                <span className={`of-estacion__nombre${a.esPersona?' is-persona':' is-ia'}`}><i className={trabajando?' is-activa':''} /><span className="of-nombre-texto">{nombreCorto(a.nombre)}</span>{info.pendientes.length+(info.iniciativas?.length||0)>0&&<b className="of-estacion__novedades">{info.pendientes.length+(info.iniciativas?.length||0)}</b>}</span>
                <span className="of-estacion__accion">{paseo?.texto|| (trabajando?(a.esPersona?a.nota_estado||'Ocupado':info.enCurso?.[0]?.nombre||info.cursos?.[0]?.detalle||'Analizando en su puesto'):a.esPersona?'Conversación y tareas':'Disponible en su puesto')}</span>
                </button>
                {paseo?.fase==='visita'&&paseo.tipo==='descanso'&&<span className="of-visita" aria-hidden="true"><FaCoffee/></span>}
                {recorridos[k]?.fase==='visita'&&<span className="of-bocadillo of-bocadillo--interaccion" role="status">“{recorridos[k].texto}”</span>}
                {sobres>0&&<button type="button" className={`of-sobre${esYo?' is-mio':''}`} onClick={()=>onPersona(a)}
                    aria-label={esYo?`Tienes ${sobres} ${sobres===1?'mensaje':'mensajes'} sin leer`:`${a.nombre} te escribió ${sobres} ${sobres===1?'mensaje':'mensajes'}`}
                    title={esYo?'Mensajes sin leer':`${a.nombre} te escribió`}><FaEnvelope/>{sobres}</button>}
                {a.esPersona&&a.destacado&&<button type="button" className="of-bocadillo" title={a.destacado.texto} aria-label={`Aviso destacado de ${a.nombre}`} onClick={()=>onPersona(a)}>“{a.destacado.texto}”</button>}</>}
            </FichaAgente>;
        })}
        {vuelos.map(v=>{
            const de=posicionPersona(v.de),a=posicionPersona(v.a);
            if(!de||!a)return null;
            return <span key={v.clave} className="of-vuelo" aria-hidden="true" style={{'--x0':`${de.left}%`,'--y0':`${de.top}%`,'--x1':`${a.left}%`,'--y1':`${a.top}%`}}><FaEnvelope/></span>;
        })}
        {chips.map(({z,px,py,texto})=>{
            const cantidad=agentes.filter(a=>a.zona===z.id).length;
            return <button key={z.id} data-zona={z.id} type="button" className="of-zona-enlace" style={{left:`${px/16.5}%`,top:`${py/7.1}%`}} onClick={()=>cantidad?onZona(String(z.id)):puedeGestionar?onCrear(z.id):onZona(String(z.id))}>
                {texto}
            </button>;
        })}

    </div>;
}
