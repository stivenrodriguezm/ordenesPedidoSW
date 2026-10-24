export const esPersonaJuridica = cliente => cliente?.tipo_persona === 'juridica';
export const tipoPersonaLabel = cliente => esPersonaJuridica(cliente) ? 'Persona jurídica' : 'Persona natural';
export const nombreClienteLabel = cliente => esPersonaJuridica(cliente) ? 'Razón social' : 'Nombre';
export const documentoClienteLabel = cliente => esPersonaJuridica(cliente) ? 'NIT' : 'Cédula';
export const documentoClienteCorto = cliente => esPersonaJuridica(cliente) ? 'NIT' : 'C.C.';
