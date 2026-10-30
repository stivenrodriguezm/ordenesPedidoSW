// «Otros conceptos» de un comprobante de egreso (2026-10-30): cada uno suma o resta al
// valor. El valor se guarda siempre positivo; los guardados antes no traen tipo y suman.
export const esResta = c => c?.tipo === 'resta';
export const valorConSigno = c => (esResta(c) ? -1 : 1) * (parseFloat(c?.valor) || 0);
export const totalOtrosConceptos = lista => (lista || []).reduce((s, c) => s + valorConSigno(c), 0);
