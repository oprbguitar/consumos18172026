/* ============================================================
   Casa Servicios — Constantes NO sensibles (tips genéricos).
   Los datos de la familia (nombres, montos, historial) viven
   CIFRADOS en payload.js y se cargan tras ingresar la contraseña.
   ============================================================ */

// Estas variables se llenan al descifrar el payload (ver crypto.js / app.js)
let PERSONAS = [];
let TODOS = [];
let CONFIG_DEFAULT = {};
let SERVICIOS = [];
let SERVICIOS_VARIABLES = [];
let MESES_SEMILLA = [];

// Consejos de ahorro (genéricos, no contienen datos personales)
const TIPS_LUZ = [
  'Cambia todos los focos por LED: consumen hasta 80% menos que los incandescentes.',
  'Desconecta cargadores y aparatos en standby (TV, microondas): el "consumo fantasma" puede ser 10% del recibo.',
  'Usa la lavadora con carga completa y agua fría; el calentar el agua es lo que más gasta.',
  'Aprovecha la luz natural de día y pinta las paredes de colores claros.',
  'Plancha toda la ropa junta una sola vez por semana en lugar de encender la plancha varias veces.',
  'Revisa la refrigeradora: que cierre bien y no esté pegada a la pared ni cerca de la cocina.',
  'Configura el aire/ventilador con temporizador para que no quede encendido toda la noche.',
];
const TIPS_AGUA = [
  'Cierra el caño mientras te enjabonas o cepillas los dientes: ahorra hasta 12 litros por minuto.',
  'Revisa fugas: una llave que gotea desperdicia más de 30 litros al día.',
  'Instala aireadores en los caños y una ducha de bajo consumo.',
  'Usa la lavadora y lavavajillas solo a carga completa.',
  'Reutiliza el agua de lavar verduras para regar las plantas.',
  'Coloca una botella con agua dentro del tanque del inodoro para reducir la descarga.',
  'Riega las plantas temprano o al atardecer para que no se evapore el agua.',
];
const TIPS_EFICIENCIA = [
  'Toma foto del recibo cada mes y regístralo el mismo día para no perder el dato.',
  'Compara tu consumo con el mismo mes del año anterior, no solo con el mes pasado.',
  'Si un servicio sube mucho de golpe, revisa: puede ser una fuga (agua) o un aparato malogrado (luz).',
  'Acuerden un día fijo del mes para que todos paguen; así nadie adelanta de más.',
  'Guarden los comprobantes en una carpeta compartida para total transparencia.',
];

// Tarjetas destacadas del inicio (llamativas, con enlace a la sección de tips)
const TIP_CARDS = [
  { titulo: 'Ahorra en tu recibo de luz', desc: 'Pequeños cambios que bajan el consumo hasta un 30%.', icono: '💡', tab: 'tips', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { titulo: 'Cuida el agua, cuida tu bolsillo', desc: 'Detecta fugas y reduce el gasto sin esfuerzo.', icono: '💧', tab: 'tips', grad: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
  { titulo: 'Consumo bajo control', desc: 'Mira tu progreso mes a mes en los gráficos.', icono: '📈', tab: 'graficos', grad: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  { titulo: 'Transparencia total', desc: 'Cada hermano ve exactamente qué paga y por qué.', icono: '🤝', tab: 'recibos', grad: 'linear-gradient(135deg,#8b5cf6,#db2777)' },
];
