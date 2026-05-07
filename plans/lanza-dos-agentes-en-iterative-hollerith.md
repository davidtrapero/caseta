# Plan — Materializar informes de seguridad y UX

## Context

Se lanzaron dos agentes Explore en paralelo para auditar el repositorio `caseta`:
1. **Seguridad y concurrencia** — vulnerabilidades, race conditions, recursividad.
2. **UX y responsive design** — propuestas para hacer la app más atractiva, usable y responsive.

Ambos agentes produjeron informes detallados como salida de su run. Esos informes solo viven en la transcripción de la conversación — el usuario quiere persistirlos como archivos en `plans/` para poder consultarlos, compartirlos y usarlos como guía de implementación posterior.

## Acción

Crear dos archivos nuevos:

1. **[plans/informe-seguridad-concurrencia.md](plans/informe-seguridad-concurrencia.md)** — informe completo del primer agente: resumen ejecutivo, hallazgos clasificados por severidad (3 CRÍTICOS, 1 ALTO, 4 MEDIOS, 2 BAJOS), análisis por dominio (auth, validación, concurrencia, exposición de datos, tokens públicos, audit), tabla de remediaciones priorizadas y conclusión.

2. **[plans/informe-ux-responsive.md](plans/informe-ux-responsive.md)** — informe completo del segundo agente: resumen ejecutivo, identidad visual (CSS vars, tipografía, radios), propuestas por pantalla (login, formulario voluntario, tablas densas, sidebar), estrategia responsive (drawer móvil, tablas adaptativas), sistema de componentes (Spinner, Toast, ConfirmDelete), accesibilidad, microinteracciones y roadmap por fases.

## Restricciones

- **No tocar código de la app** — solo se crean dos archivos `.md` dentro de `plans/`.
- **Preservar el contenido íntegro** de los informes de los agentes (con referencias `[archivo](path)` clicables).
- **Sin cambios de configuración** ni dependencias.

## Verificación

Tras la creación:
- `ls plans/informe-*.md` debe listar los dos archivos.
- Apertura en el editor: ambos archivos renderizan correctamente como markdown con enlaces relativos al árbol del repo.
- Contenido coherente con la transcripción de los subagentes (sin truncado).
