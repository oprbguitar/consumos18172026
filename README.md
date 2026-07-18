# 🏠 Casa Servicios

Aplicación web para registrar y repartir de forma **transparente** el pago mensual de
servicios del hogar entre varios integrantes de la familia.

👉 **Ver la app:** https://oprbguitar.github.io/consumos18172026/

> 🔒 **Acceso protegido.** Los datos de la familia (nombres, montos e historial) están
> **cifrados** (AES-256-GCM) dentro de `js/payload.js` y solo se descifran en el navegador
> tras ingresar la contraseña. Sin la contraseña no se ve ningún dato, ni siquiera mirando
> el código. Comparte el enlace **y** la contraseña únicamente con quienes autorices.

## ¿Qué hace?

- **Registro mensual**: escribes el total del recibo (agua, luz, gas, etc.) y calcula
  automáticamente cuánto le toca a cada integrante.
- **Recibos / PDF**: genera una hoja **horizontal de una sola página** con el detalle de pago
  de todos, lista para imprimir o guardar como PDF.
- **Histórico**: tabla con todos los meses y el promedio por persona.
- **Gráficos**: evolución del consumo (luz, agua, gas) y ranking de pagos.
- **Tips**: consejos de ahorro de luz, agua y eficiencia.

## Datos y privacidad

- Los datos vienen **cifrados** en `js/payload.js`.
- Lo que registres nuevo se guarda en **tu navegador** (localStorage).
- **Exportar**: descarga una copia de seguridad (sin cifrar) en tu equipo.
- **Publicar**: vuelve a cifrar los datos actuales y descarga un nuevo `payload.js` para
  actualizar el repositorio, de modo que quienes abran el enlace vean los cambios.

## Tecnología

HTML, CSS y JavaScript puro, sin dependencias externas. Cifrado con la Web Crypto API del
navegador. Se sirve como sitio estático en GitHub Pages.
