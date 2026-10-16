import { leerPesos } from '../../utils/capturaPrecios';

export const borradorEspecial = (config = {}) => ({
  costo: String(config.costo_base ?? ''), sentido: config.sentido || 'sube',
  general: config.multiplicador == null, multiplo: String(config.multiplicador ?? '').replace('.', ','),
  tela: config.metraje_tela != null, metraje: String(config.metraje_tela ?? '').replace('.', ','),
  cuero: config.decimetraje_cuero != null, decimetraje: String(config.decimetraje_cuero ?? '').replace('.', ','),
});
export function validarBorradorEspecial(form) {
  const errores = {}, config = { sentido: form.sentido };
  try { config.costo_base = String(leerPesos(form.costo)); } catch (e) { errores.costo = e.message; }
  const decimal = (campo, max, decimales) => {
    const raw = form[campo].trim();
    if (!new RegExp(`^\\d+(?:[.,]\\d{1,${decimales}})?$`).test(raw) || Number(raw.replace(',', '.')) <= 0 || Number(raw.replace(',', '.')) >= max) {
      errores[campo] = `Indica un valor mayor a cero, menor a ${max.toLocaleString('es-CO')} y con máximo ${decimales} decimales.`; return null;
    }
    return String(Number(raw.replace(',', '.')));
  };
  config.multiplicador = form.general ? null : decimal('multiplo', 1000, 3);
  config.metraje_tela = form.tela ? decimal('metraje', 1000000, 2) : null;
  config.decimetraje_cuero = form.cuero ? decimal('decimetraje', 1000000, 2) : null;
  return { config, errores, valido: Object.keys(errores).length === 0 };
}
export function diferenciaEspecial(form, grupo, general) {
  const { config, valido } = validarBorradorEspecial(form);
  if (!valido) return null;
  const mult = config.multiplicador ?? general;
  if (mult == null || !Number.isFinite(Number(mult))) return null;
  const material = config.metraje_tela != null || config.decimetraje_cuero != null;
  const consumo = grupo?.tipo === 'cuero' ? config.decimetraje_cuero : config.metraje_tela;
  if (material && (!grupo || consumo == null)) return null;
  return (Number(config.costo_base) + Number(consumo || 0) * Number(grupo?.precio_por_metro || 0)) * Number(mult) * (config.sentido === 'baja' ? -1 : 1);
}
