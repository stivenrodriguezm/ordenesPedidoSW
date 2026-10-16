// Pasillos de 64/48/42 unidades y siete unidades de superficie útil:
// Comercial conserva exactamente el doble del área de cada otra zona.
const x=20,y=20,w=1030,h=505,paso=64,entreFilas=48,entreSalas=42;
let menor=400,mayor=w-100;
for(let i=0;i<50;i++){
    const l=(menor+mayor)/2,r=(l-entreSalas)/2,f=(l-entreSalas*2)/3;
    const superficie=r*f*(h-entreFilas)/(r+f);
    if((w-paso-l)*h>superficie*2)menor=l;else mayor=l;
}
const izquierda=(menor+mayor)/2,superior=(izquierda-entreSalas)/2,inferior=(izquierda-entreSalas*2)/3;
const altoSuperior=inferior*(h-entreFilas)/(superior+inferior),altoInferior=h-entreFilas-altoSuperior;
export const pasillos=[
    {x:x+izquierda,y,w:paso,h},
    {x,y:y+altoSuperior,w:izquierda,h:entreFilas},
    {x:x+superior,y,w:entreSalas,h:altoSuperior},
    {x:x+inferior,y:y+altoSuperior+entreFilas,w:entreSalas,h:altoInferior},
    {x:x+inferior*2+entreSalas,y:y+altoSuperior+entreFilas,w:entreSalas,h:altoInferior},
];
const espacios=[
    {tipo:'gerencia',x,y,w:superior,h:altoSuperior},
    {tipo:'oficina',x:x+superior+entreSalas,y,w:superior,h:altoSuperior},
    {tipo:'entrenamiento',x,y:y+altoSuperior+entreFilas,w:inferior,h:altoInferior},
    {tipo:'creativo',x:x+inferior+entreSalas,y:y+altoSuperior+entreFilas,w:inferior,h:altoInferior},
    {tipo:'social',x:x+inferior*2+entreSalas*2,y:y+altoSuperior+entreFilas,w:inferior,h:altoInferior},
    {tipo:'showroom',x:x+izquierda+paso,y,w:w-izquierda-paso,h},
];
export const capacidadZona=ambiente=>({gerencia:3,showroom:7,entrenamiento:1,tecnologia:1,social:3}[ambiente]||2);
export function distribuirZonas(zonas){
    const disponibles=[...espacios],asignadas=new Map();
    for(const z of zonas){
        const tipo=z.ambiente==='tecnologia'?'entrenamiento':z.ambiente;
        const i=disponibles.findIndex(e=>e.tipo===tipo);
        if(i>=0)asignadas.set(z.id,disponibles.splice(i,1)[0]);
    }
    return zonas.map(z=>({...z,espacio:asignadas.get(z.id)||disponibles.shift()}));
}
export function puestosZona(ambiente,ancho=343){
    if(ambiente==='showroom')return [[118,80],[55,195],[175,195],[55,313],[175,313],[55,427],[175,427]];
    if(ambiente==='gerencia')return [[65,80],[177,133],[278,85]];
    if(ambiente==='entrenamiento'||ambiente==='tecnologia')return [[107,93]];
    if(ambiente==='creativo')return [[62,148],[160,225]];
    if(ambiente==='social')return [[40,150],[132,155],[130,220]];
    return ancho<270?[[62,148],[160,225]]:[[65,90],[232,132]];
}
