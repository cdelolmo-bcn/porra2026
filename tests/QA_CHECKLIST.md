# Checklist manual de QA — porra2026

Esto complementa los tests automáticos (`npm test`), que cubren:
- La lógica pura de grupos/bracket/puntuación (`calcStandings`, `bR32`, `calcScore`...)
- La fórmula de puntuación Fantasy (`fCalcPts`)
- El ensamblado de una porra para enviarla/editarla (`collectPorra`, `valKO`)

Todo lo que toca el DOM real de forma no segura (sin `?.`) o hace llamadas
reales a Supabase hay que verificarlo a mano, en el navegador, **tras
cualquier cambio grande** (como dividir `app.js` en módulos). Esto incluye
sobre todo: el flujo de construir el equipo Fantasy (selector de jugadores),
el panel de Admin, y cualquier guardado real contra la base de datos.

Repite esta lista usando una cuenta de prueba (no la tuya de admin) y, si
puedes, también con la cuenta de admin para la sección correspondiente.

## 1. Carga inicial
- [ ] La página carga sin errores en la consola del navegador (F12 → Console)
- [ ] El CSS se ve correctamente aplicado (no aparece "sin estilos")
- [ ] La cuenta atrás del plazo (`deadline-wrap`) muestra un valor coherente

## 2. Autenticación
- [ ] Login con Google funciona y redirige de vuelta a la app
- [ ] Login con email/contraseña funciona (crear cuenta nueva)
- [ ] El nombre/avatar del usuario aparece en la cabecera tras login
- [ ] Cerrar sesión funciona y vuelve a mostrar el botón "Entrar"

## 3. Rellenar y enviar una porra
- [ ] "Nueva Porra" abre el formulario en el paso 1
- [ ] Se puede rellenar el nombre y avanzar
- [ ] Los 12 grupos se pueden rellenar y la clasificación en vivo se actualiza
- [ ] El botón aleatorio (🎲) rellena resultados de grupo correctamente
- [ ] Al pasar a R32, el cuadro se genera con los equipos correctos según los grupos
- [ ] Se puede seleccionar ganador en cada cruce de R32/Octavos/Cuartos/Semis/Final
- [ ] Los campos de Goleador/Jugador del Torneo autocompletan al escribir
- [ ] El campeón y la posición de España se autocompletan al rellenar la final
- [ ] "Enviar Porra" guarda correctamente y aparece en "Mis Porras"

## 4. Editar una porra existente
- [ ] "Mis Porras" lista las porras del usuario logueado
- [ ] "Editar" carga los datos previos correctamente en el formulario
- [ ] Guardar los cambios actualiza la porra (no crea una duplicada)
- [ ] Tras el cierre del plazo, el botón de editar desaparece/se bloquea

## 5. Clasificación
- [ ] La tabla de clasificación carga y ordena por puntos
- [ ] Antes del cierre del plazo, solo se ven nombre/estado de pago (no detalles)
- [ ] Tras el cierre, se puede pulsar un nombre y ver el detalle de su porra
- [ ] Los badges/logros se muestran correctamente sobre el nombre

## 6. Comparador de porras
- [ ] Se puede abrir el comparador desde la clasificación
- [ ] Si tienes varias porras propias, el selector funciona
- [ ] Las coincidencias/diferencias se marcan en verde/rojo correctamente

## 7. Simulador (Laboratorio What If)
- [ ] Antes del inicio del Mundial, muestra el aviso de "no disponible"
- [ ] Tras el inicio (o con el modo debug activado), se pueden elegir ganadores hipotéticos
- [ ] "Calcular ranking teórico" muestra una tabla de resultados simulados
- [ ] "Resetear" limpia las selecciones hechas

## 8. Estadísticas
- [ ] Antes del cierre del plazo, muestra el aviso de "no disponible aún"
- [ ] Tras el cierre, muestra gráficos de campeón/España/goleador/MVP con datos reales

## 9. Muro de comentarios
- [ ] Sin sesión iniciada, se ve el muro pero no se puede escribir
- [ ] Con sesión iniciada, se puede enviar un mensaje y aparece al instante
- [ ] El límite de envío (8s entre mensajes) funciona

## 10. Fantasy
- [ ] "Mi Equipo" permite elegir formación y completar los 11 jugadores
- [ ] El buscador de jugadores filtra correctamente por nombre/selección
- [ ] No se pueden elegir más de 3 jugadores de la misma selección
- [ ] Se puede marcar un capitán pulsando sobre un jugador del campo
- [ ] "Guardar equipo" persiste los cambios
- [ ] La clasificación Fantasy se actualiza tras sincronizar partidos (ver sección Admin)

## 11. Panel de Admin (con cuenta admin)
- [ ] El cuadro KO de Admin permite rellenar resultados y se propagan a rondas siguientes
- [ ] "Guardar y recalcular" actualiza los puntos de todas las porras
- [ ] La pestaña "Porras y Pagos" permite marcar como pagada una porra
- [ ] "Editar Porra" permite buscar, modificar y transferir una porra a otro usuario
- [ ] "Importar Excel" procesa un fichero de prueba sin errores
- [ ] El panel Fantasy de Admin sincroniza un partido de prueba con SofaScore
- [ ] El modo Debug/Simulación se puede activar y desactivar correctamente

## 12. Multilenguaje
- [ ] Cambiar el idioma (selector ES/CA/EN/FR/DE/IT/NL) traduce los textos visibles
- [ ] El idioma persiste al recargar la página

---
**Cuándo usar esta lista completa vs. una versión reducida:**
- Cambios pequeños (un texto, un estilo) → no hace falta pasar la lista entera
- División de `app.js` en módulos, cambios en `calcScore`/bracket, cambios en auth →
  pasa la lista completa antes de dar por bueno el deploy
