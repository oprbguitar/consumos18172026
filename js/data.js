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

/* ---------- Tarifas aproximadas de los proveedores (info pública) ----------
   Luz: Luz del Sur, tarifa BT5B residencial (ambas casas están en su zona de concesión).
   Agua: Sedapal; San Bartolo tiene tarifa de balneario (más alta).
   Valores referenciales 2026; el recibo final añade IGV y alumbrado público. */
const TARIFAS = {
  luz: {
    proveedor: 'Luz del Sur',
    tramos: [
      { hasta: 30,       precio: 0.47 },
      { hasta: 140,      precio: 0.68 },
      { hasta: Infinity, precio: 0.70 },
    ],
    // Precio efectivo aproximado incluyendo IGV (18%) y alumbrado (~4%)
    efectivoKwh: 0.85,
  },
  agua: {
    lima: {
      proveedor: 'Sedapal', etiqueta: 'Lima',
      tramos: [
        { hasta: 10, precio: 2.20 }, { hasta: 20, precio: 2.36 },
        { hasta: 50, precio: 3.22 }, { hasta: Infinity, precio: 7.32 },
      ],
    },
    sb: {
      proveedor: 'Sedapal (balneario)', etiqueta: 'San Bartolo',
      tramos: [
        { hasta: 10, precio: 2.87 }, { hasta: 20, precio: 3.22 },
        { hasta: Infinity, precio: 7.32 },
      ],
    },
  },
};

/* ---------- Electrodomésticos (potencias típicas, estilo calculadora MINEM) ---------- */
const ELECTRODOMESTICOS = [
  { id: 'foco_led',      nombre: 'Foco LED',              watts: 10,   horasDef: 5 },
  { id: 'foco_ahorr',    nombre: 'Foco ahorrador',        watts: 20,   horasDef: 5 },
  { id: 'foco_incand',   nombre: 'Foco incandescente',    watts: 60,   horasDef: 5 },
  { id: 'tv_led',        nombre: 'Televisor LED',         watts: 80,   horasDef: 4 },
  { id: 'refrigeradora', nombre: 'Refrigeradora',         watts: 150,  horasDef: 8 },
  { id: 'laptop',        nombre: 'Laptop',                watts: 60,   horasDef: 6 },
  { id: 'pc',            nombre: 'Computadora de mesa',   watts: 300,  horasDef: 4 },
  { id: 'licuadora',     nombre: 'Licuadora',             watts: 400,  horasDef: 0.2 },
  { id: 'lavadora',      nombre: 'Lavadora',              watts: 500,  horasDef: 1 },
  { id: 'olla_arroz',    nombre: 'Olla arrocera',         watts: 700,  horasDef: 0.5 },
  { id: 'microondas',    nombre: 'Microondas',            watts: 1100, horasDef: 0.3 },
  { id: 'plancha',       nombre: 'Plancha',               watts: 1200, horasDef: 0.5 },
  { id: 'aspiradora',    nombre: 'Aspiradora',            watts: 1200, horasDef: 0.5 },
  { id: 'terma',         nombre: 'Terma eléctrica',       watts: 1500, horasDef: 2 },
  { id: 'hervidor',      nombre: 'Hervidor eléctrico',    watts: 1800, horasDef: 0.3 },
  { id: 'ducha',         nombre: 'Ducha eléctrica',       watts: 3500, horasDef: 0.5 },
  { id: 'aire',          nombre: 'Aire acondicionado',    watts: 1400, horasDef: 4 },
  { id: 'ventilador',    nombre: 'Ventilador',            watts: 60,   horasDef: 6 },
  { id: 'consola',       nombre: 'Consola de videojuegos',watts: 150,  horasDef: 2 },
  { id: 'cargador',      nombre: 'Cargador de celular',   watts: 6,    horasDef: 3 },
];

/* ---------- Tips detallados (con ahorro estimado y pasos concretos) ---------- */
const TIPS_DETALLADOS = [
  { cat: 'luz', icono: '💡', titulo: 'Cambia a focos LED', ahorro: 'S/ 15–25 al mes', dificultad: 'Fácil',
    pasos: [
      'Identifica los 5 focos que más horas están encendidos.',
      'Reemplázalos por LED de 10 W (rinden como uno incandescente de 60 W).',
      'Cada foco cambiado, usado 5 h/día, ahorra ~7.5 kWh al mes (~S/ 6).',
    ] },
  { cat: 'luz', icono: '🔌', titulo: 'Elimina el consumo fantasma', ahorro: 'S/ 8–15 al mes', dificultad: 'Fácil',
    pasos: [
      'Conecta TV, decodificador y equipos de sonido a una regleta con interruptor.',
      'Apaga la regleta al dormir y al salir de casa.',
      'Desenchufa cargadores que no estén en uso: en standby siguen consumiendo.',
    ] },
  { cat: 'luz', icono: '👕', titulo: 'Plancha todo junto, una vez por semana', ahorro: 'S/ 5–10 al mes', dificultad: 'Fácil',
    pasos: [
      'La plancha usa 1200 W: una hora cuesta ~S/ 1 de luz.',
      'Junta la ropa de la semana y plancha en una sola sesión.',
      'Empieza por las prendas delgadas mientras calienta.',
    ] },
  { cat: 'luz', icono: '🧊', titulo: 'Refrigeradora eficiente', ahorro: 'S/ 10–20 al mes', dificultad: 'Media',
    pasos: [
      'Sepárala 10 cm de la pared y lejos de la cocina o ventanas con sol.',
      'Revisa que el empaque de la puerta selle bien (prueba con una hoja de papel).',
      'No guardes comida caliente ni abras la puerta más de lo necesario.',
    ] },
  { cat: 'luz', icono: '🌀', titulo: 'Lavadora inteligente', ahorro: 'S/ 6–12 al mes', dificultad: 'Fácil',
    pasos: [
      'Lava solo con carga completa (una carga grande gasta menos que dos medianas).',
      'Usa agua fría: calentar el agua es lo que más energía consume.',
      'Aprovecha el sol para secar en lugar de secadora.',
    ] },
  { cat: 'agua', icono: '🚽', titulo: 'Caza las fugas', ahorro: 'S/ 10–30 al mes', dificultad: 'Media',
    pasos: [
      'Un inodoro con fuga pierde hasta 4,500 litros al mes (≈ 4.5 m³).',
      'Prueba: echa colorante al tanque; si el agua de la taza se tiñe sola, hay fuga.',
      'Revisa también caños que gotean: 1 gota/segundo ≈ 30 litros diarios.',
    ] },
  { cat: 'agua', icono: '🚿', titulo: 'Ducha de 5 minutos', ahorro: 'S/ 8–15 al mes', dificultad: 'Fácil',
    pasos: [
      'Cada minuto de ducha usa ~10 litros.',
      'Pon música: 1–2 canciones = ducha completa.',
      'Cierra el caño mientras te enjabonas.',
    ] },
  { cat: 'agua', icono: '🔧', titulo: 'Instala aireadores', ahorro: 'S/ 5–10 al mes', dificultad: 'Fácil',
    pasos: [
      'Cuestan pocos soles en cualquier ferretería y se enroscan en el caño.',
      'Reducen el caudal hasta 50% sin que se sienta.',
      'Prioriza el caño de la cocina y del baño más usado.',
    ] },
  { cat: 'agua', icono: '🪣', titulo: 'Reutiliza el agua', ahorro: 'S/ 4–8 al mes', dificultad: 'Fácil',
    pasos: [
      'El agua de lavar verduras sirve para regar plantas.',
      'Junta el agua fría que sale antes de que caliente la ducha en un balde.',
      'Riega temprano o al atardecer para que no se evapore.',
    ] },
  { cat: 'gas', icono: '🍳', titulo: 'Cocina con tapa y a fuego justo', ahorro: 'S/ 3–8 al mes', dificultad: 'Fácil',
    pasos: [
      'Tapar la olla reduce el tiempo de cocción hasta 30%.',
      'La llama no debe salir del borde de la olla: eso es gas desperdiciado.',
      'Apaga la hornilla 2–3 min antes: el calor restante termina la cocción.',
    ] },
  { cat: 'gas', icono: '🔥', titulo: 'Mantenimiento de la cocina', ahorro: 'S/ 2–5 al mes', dificultad: 'Media',
    pasos: [
      'Llama amarilla = mala combustión; debe ser azul. Limpia los quemadores.',
      'Revisa la manguera y conexiones con agua jabonosa (burbujas = fuga).',
    ] },
  { cat: 'eficiencia', icono: '📸', titulo: 'Registra el mismo día', ahorro: 'Orden total', dificultad: 'Fácil',
    pasos: [
      'Toma foto del recibo apenas llegue y regístralo aquí ese mismo día.',
      'Así las alertas del resumen comparan siempre datos completos.',
    ] },
  { cat: 'eficiencia', icono: '📅', titulo: 'Compara con el año anterior', ahorro: 'Mejor análisis', dificultad: 'Fácil',
    pasos: [
      'El consumo cambia por estación (verano = más agua y ventilador).',
      'Compara julio contra julio, no solo contra junio.',
      'Usa la pestaña Histórico para ver la serie completa.',
    ] },
  { cat: 'eficiencia', icono: '🤝', titulo: 'Un solo día de pago', ahorro: 'Cero deudas', dificultad: 'Fácil',
    pasos: [
      'Acuerden una fecha fija (ej. cada 5 del mes) para que todos paguen.',
      'Generen el PDF de recibos y compártanlo en el grupo familiar.',
    ] },
];

const CATEGORIAS_TIPS = [
  { id: 'luz',        nombre: 'Ahorro de luz',   icono: '💡', color: '#f59e0b' },
  { id: 'agua',       nombre: 'Ahorro de agua',  icono: '💧', color: '#2563eb' },
  { id: 'gas',        nombre: 'Ahorro de gas',   icono: '🔥', color: '#dc2626' },
  { id: 'eficiencia', nombre: 'Organización',    icono: '📊', color: '#16a34a' },
];

// Tarjetas destacadas del inicio (llamativas, con enlace a la sección de tips)
const TIP_CARDS = [
  { titulo: 'Ahorra en tu recibo de luz', desc: 'Pequeños cambios que bajan el consumo hasta un 30%.', icono: '💡', tab: 'tips', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { titulo: 'Cuida el agua, cuida tu bolsillo', desc: 'Detecta fugas y reduce el gasto sin esfuerzo.', icono: '💧', tab: 'tips', grad: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
  { titulo: 'Consumo bajo control', desc: 'Mira tu progreso mes a mes en los gráficos.', icono: '📈', tab: 'graficos', grad: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  { titulo: 'Transparencia total', desc: 'Cada hermano ve exactamente qué paga y por qué.', icono: '🤝', tab: 'recibos', grad: 'linear-gradient(135deg,#8b5cf6,#db2777)' },
];
