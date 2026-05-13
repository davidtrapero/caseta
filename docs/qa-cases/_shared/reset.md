# Reset de BD entre casos

Para garantizar aislamiento entre casos, el orquestador resetea la BD **antes de cada caso** llamando al endpoint protegido.

## Endpoint

`POST <BASE_URL>/api/test-reset` — el orquestador te da la `BASE_URL` real (puerto puede variar).

Header obligatorio:
```
x-test-secret: <BETTER_AUTH_SECRET de .env.test>
```

## Vía MCP Playwright

Usar `browser_network_request` con método POST y el header anterior. Esperar 200 OK.

Respuesta (200):
```json
{
  "seed": {
    "edicionId": "...",
    "casetaId": "...",
    "proveedorId": "..."
  }
}
```

Si el endpoint devuelve 401: el server no fue arrancado con `ENABLE_TEST_ENDPOINTS=true` o el secret no coincide. Abortar el run y reportar.

## Estado tras reset

Ver [README → Estructura del seed mínimo](../README.md#estructura-del-seed-mínimo).
