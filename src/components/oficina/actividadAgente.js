export const fechaTarea = (valor, corta = false) => valor ? new Intl.DateTimeFormat('es-CO', {
    timeZone:'America/Bogota', day:'numeric', month:'short', ...(corta ? {} : {hour:'2-digit',minute:'2-digit',hour12:true}),
}).format(new Date(valor)) : 'Sin horario';

export function actividadAgente(datos, agente) {
    const pertenece = item => agente.id == null ? item.es_general === true : !item.es_general && item.perfil === agente.id;
    const tareas = (datos?.automatizaciones || []).filter(pertenece);
    const pendientes = (datos?.pendientes || []).filter(pertenece);
    const enCurso = (datos?.en_curso || []).filter(pertenece);
    const siguientes = tareas.filter(t=>t.activa && t.proxima_ejecucion).sort((a,b)=>new Date(a.proxima_ejecucion)-new Date(b.proxima_ejecucion));
    const iniciativas=(datos?.iniciativas||[]).filter(t=>t.perfil===agente.id);
    const cursos=(datos?.cursos||[]).filter(t=>t.perfil===agente.id);
    const compartido=(datos?.trabajando||[]).some(t=>t.perfil===agente.id);
    return {tareas,pendientes,enCurso,iniciativas,cursos,compartido,proxima:siguientes[0],motor:datos?.motor,disponible:!!datos?.motor};
}

export const NOMBRES_AREAS={pagina_web:'Página web',ventas:'Ventas',clientes:'Clientes',cobros:'Cartera',pedidos:'Compras y entregas',finanzas:'Finanzas',inventario:'Inventario',nomina:'Nómina',formacion:'Formación',operaciones:'Operaciones'};
export function objetivoAgente(agente){
    const texto=(agente.instrucciones||'').match(/(?:tu objetivo es|tu función es|objetivo:)\s*([^\n]+)/i)?.[1];
    return (texto||agente.rol||'Conectar las áreas y acompañar las decisiones de gerencia').slice(0,260);
}

export function visitasEstrategicas(agente,zonas){
    if(agente.esPersona)return [];
    const afinidades={pagina_web:['creativo','showroom'],ventas:['showroom','creativo'],clientes:['showroom'],formacion:['showroom','entrenamiento'],
        operaciones:['oficina','showroom'],pedidos:['oficina','showroom'],inventario:['oficina','creativo'],finanzas:['oficina','gerencia'],cobros:['showroom','gerencia']};
    const tipos=new Set((agente.areas||[]).flatMap(a=>afinidades[a]||[]));
    if(agente.id==null){tipos.add('oficina');tipos.add('showroom');tipos.add('entrenamiento');}
    return zonas.filter(z=>z.z.id!==agente.zona&&tipos.has(z.z.ambiente)).map(({z,x,y,w,h})=>({x:x+w/2,y:y+h-48,nombre:z.nombre,texto:`Explorando oportunidades en ${z.nombre}`}));
}

export const ESTADOS_TAREA = {pendiente:'En cola',ejecutando:'Trabajando',listo:'Resultado listo',error:'Requiere revisión'};

export const horarioTarea = t => {
    const hora = String(t.hora || '09:00').slice(0,5);
    if(t.frecuencia==='una_vez') return fechaTarea(t.fecha_unica);
    if(t.frecuencia==='mensual') return `Día ${t.dia_mes} · ${hora}`;
    if(t.frecuencia==='semanal') return `${(t.dias_semana||[]).map(d=>['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][d]).join(', ')} · ${hora}`;
    return `Cada día · ${hora}`;
};
