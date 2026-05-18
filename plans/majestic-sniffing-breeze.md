# Fix: deploy de `preprod` en Vercel falla con `Exit handler never called!`

## Context

El último push a `preprod` (commit `011ca71`) ha disparado un build en Vercel que muere durante `npm install` con el error genérico:

```
npm error Exit handler never called!
Error: Command "npm install" exited with 1
```

### Causa raíz

El `package-lock.json` de `preprod` tiene **29 URLs `resolved` apuntando al Nexus corporativo de Sanitas** (`https://ic.sanitas.dom/...`) — un registro interno solo accesible desde la red corporativa.

Esto ocurrió porque algún `npm install` reciente (probablemente al añadir `@radix-ui/react-popover` y `html-to-image` durante la fase de glass warm theme) se ejecutó con el `~/.npmrc` global del usuario activo, que está configurado a:

```
@sanitas:registry=https://ic.sanitas.dom/nexus/repository/sanitas-npm-private/
registry=https://ic.sanitas.dom/nexus/repository/sanitas-npm/
```

Con `lockfileVersion: 3`, npm respeta la URL `resolved` del lockfile **por encima** del `registry` configurado. Vercel build corre en IAD-East, no resuelve DNS contra `ic.sanitas.dom`, npm cuelga sin liberar el proceso → `Exit handler never called!` (síntoma genérico de npm muriendo a mitad de descarga).

### Verificación previa

| Rama | URLs `ic.sanitas.dom` | URLs `registry.npmjs.org` |
|---|---:|---:|
| `main` (último deploy OK) | 0 | 640 |
| `preprod` (deploy roto) | 29 | 640 |

Paquetes afectados (todos transitorios de las dos deps añadidas):
`@radix-ui/react-popover` y deps (`react-arrow`, `react-popper`, `react-portal`, `react-presence`, `react-context`, `react-dismissable-layer`, `react-focus-guards`, `react-focus-scope`, `react-id`, `react-slot`, `react-use-callback-ref`, `react-use-escape-keydown`, `react-use-rect`, `react-use-size`, `rect`), `@floating-ui/{core,dom,react-dom,utils}`, `html-to-image`, `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`, `use-callback-ref`, `use-sidecar`, `aria-hidden`, `detect-node-es`, `get-nonce`.

## Approach

Regenerar `package-lock.json` desde cero con el registry público forzado por entorno (sin tocar `~/.npmrc` global ni añadir `.npmrc` al repo). Una sola limpieza idempotente: borrar lockfile + `node_modules`, instalar con `npm_config_registry` apuntando a `registry.npmjs.org`, y verificar que el nuevo lockfile no contiene ninguna referencia a `ic.sanitas.dom`.

No hay cambios en `package.json` ni en código. La superficie del cambio es **solo** `app/package-lock.json`.

## Critical files

- [app/package-lock.json](app/package-lock.json) — único fichero modificado.
- [app/package.json](app/package.json) — leído, no modificado.
- `~/.npmrc` (fuera del repo) — origen del problema, no se toca por decisión del usuario.

## Steps

Todos los comandos desde [`app/`](app/).

1. **Cerrar dev server si está corriendo** (Windows). Evita locks en `node_modules`.

2. **Limpiar artefactos**:
   ```bash
   rm -rf app/node_modules app/package-lock.json
   ```

3. **Reinstalar forzando registry público**, sin tocar `~/.npmrc`:
   ```bash
   cd app && npm_config_registry=https://registry.npmjs.org/ npm install
   ```

   Variable de entorno tiene **mayor prioridad** que `~/.npmrc` para esta invocación únicamente, por lo que el lockfile resultante tendrá todas las URLs apuntando al registro público.

4. **Verificar lockfile limpio**:
   ```bash
   grep -c 'ic.sanitas.dom' app/package-lock.json   # debe devolver 0
   grep -c 'registry.npmjs.org' app/package-lock.json   # debe ser ~640+
   ```

5. **Verificar build local** (sanity check, opcional pero recomendado):
   ```bash
   cd app && npm run build
   ```
   Si pasa, los `resolved` del nuevo lockfile son válidos y completos.

6. **Commit del lockfile** en `preprod`:
   ```bash
   git add app/package-lock.json
   git commit -m "fix(deps): regenera lockfile con registry público para deploy en Vercel"
   ```

7. **Push y validar deploy**:
   ```bash
   git push origin preprod
   ```
   Comprobar en Vercel que el build de `preprod` ya no falla en `npm install`.

## Verification end-to-end

- **Local**: pasos 4 y 5. Si `npm run build` termina OK con el nuevo lockfile, las URLs `resolved` son resolubles desde fuera de la red corporativa.
- **Remoto (Vercel)**: tras el push, el siguiente build de `preprod` debe pasar la fase `Installing dependencies...` sin el error `Exit handler never called!`.
- **Comprobación de no-regresión funcional**: el build genera el mismo output que `main` + los cambios feature. No hay cambios en versiones declaradas en `package.json`, así que el árbol de dependencias resuelto debe ser idéntico salvo por las URLs `resolved`.

## Notas y riesgos

- **Riesgo de recurrencia**: por decisión explícita del usuario no se añade `.npmrc` al repo. Si en el futuro vuelves a hacer `npm install` desde la red corporativa sin pasar `npm_config_registry=...`, el problema reaparecerá. Mitigación a tu cargo: usar el override en CLI o memorizar la disciplina.
- **Sin cambios en `package.json`**: regenerar el lockfile no debería cambiar versiones resueltas mientras los rangos `^` no se hayan movido en el registry público desde la última instalación. En el peor caso, alguna patch version más reciente podría entrar — el build local lo cazaría.
- **Idempotencia**: si por cualquier motivo el comando 3 falla, se puede repetir desde cero (paso 2) sin efectos colaterales.
