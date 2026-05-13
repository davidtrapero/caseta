# Procedimiento de login

Credenciales del seed de test (no son producción). Definidas en [src/test/fixtures.ts](../../../app/src/test/fixtures.ts).

| Rol | Email | Password |
|---|---|---|
| admin | `admin@caseta.test` | `test1234!` |
| gerente | `gerente@caseta.test` | `test1234!` |
| cajero | `cajero@caseta.test` | `test1234!` |

## Pasos vía MCP Playwright

> El orquestador te pasa `<BASE_URL>` (puerto puede variar). No asumir 3100.

1. `browser_navigate` → `<BASE_URL>/login`
2. `browser_fill_form`:
   - Campo "Email" → email del rol
   - Campo "Contraseña" → `test1234!`
3. `browser_click` → botón "Entrar"
4. `browser_wait_for` → URL no contiene `/login` (timeout 15s)

## Verificación

- `browser_snapshot` debe mostrar la home (dashboard) o la ruta solicitada.
- Si tras 15s sigue en `/login`, comprobar `role="alert"` con el mensaje de error y reportar fallo.
