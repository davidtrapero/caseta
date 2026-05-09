# Casos QA — Auth

Cobertura: login, logout, redirect sin sesión.

---

### CASO-AUTH-001: Login admin redirige fuera de /login

**Rol**: público (transición a admin)
**Pasos**:
1. Navegar a `/login`
2. Rellenar email `admin@caseta.test`, password `test1234!`
3. Click "Entrar"

**Aserciones**:
- URL final no contiene `/login`
- `browser_snapshot` muestra navegación lateral con secciones de admin (ediciones, casetas, usuarios)

---

### CASO-AUTH-002: Login con password incorrecta muestra error

**Rol**: público
**Pasos**:
1. Navegar a `/login`
2. Rellenar email `admin@caseta.test`, password `password-incorrecto`
3. Click "Entrar"

**Aserciones**:
- URL sigue conteniendo `/login`
- Hay un elemento con `role="alert"` visible

---

### CASO-AUTH-003: Login gerente y cajero también funcionan

**Rol**: público
**Pasos**:
1. Login como `gerente@caseta.test` / `test1234!` → verificar redirect fuera de `/login`
2. Logout (click en menú usuario → "Cerrar sesión", o equivalente)
3. Login como `cajero@caseta.test` / `test1234!` → verificar redirect fuera de `/login`

**Aserciones**:
- Ambos roles consiguen entrar
- Tras logout vuelve a `/login` o página pública

---

### CASO-AUTH-004: Acceso sin cookie redirige a /login

**Rol**: público
**Pasos**:
1. Sin haber hecho login (navegador limpio), navegar directamente a `/turnos`

**Aserciones**:
- URL final es `/login` (con o sin query `?redirect=`)
- No se filtra contenido de `/turnos` en el HTML

---

### CASO-AUTH-005: Login con email inexistente muestra error genérico

**Rol**: público
**Pasos**:
1. Navegar a `/login`
2. Rellenar email `noexiste@caseta.test`, password cualquiera
3. Click "Entrar"

**Aserciones**:
- URL sigue en `/login`
- Mensaje de error visible (no debe revelar si el email existe o no — solo error genérico)
