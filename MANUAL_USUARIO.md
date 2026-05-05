# Manual de usuario — Caseta

## 1. Bienvenida

**Caseta** es una aplicación web privada para gestionar el día a día de las casetas de feria: turnos del personal, voluntarios, inventario y caja. Está pensada para uso interno por parte del equipo que organiza la feria — no es una caja registradora ni una app de público general.

El uso típico es desde un ordenador, en oficina o desde casa. La aplicación está diseñada para 2 a 5 personas trabajando a la vez. Toda la información se organiza por **edición** (el año concreto de la feria) y por **caseta**, de modo que cada año arranca con datos limpios pero conserva el histórico.

---

## 2. Primeros pasos

### Iniciar sesión

1. Abre la URL de la aplicación en tu navegador.
2. Si no has iniciado sesión, te llevará automáticamente a `/login`.
3. Introduce tu correo electrónico y contraseña.
4. Si las credenciales son correctas, entrarás al panel principal.

Si no tienes cuenta, pídesela al administrador. No hay registro abierto.

### Estructura general de la pantalla

Una vez dentro verás:

- **Barra lateral izquierda** con los módulos a los que tienes acceso (varía según tu rol).
- **Área principal** a la derecha con el contenido del módulo seleccionado.
- **Pie de la barra lateral**: tu nombre, correo, rol y botón para cerrar sesión.

### Qué ves según tu rol

- **Admin**: todo el menú, incluida Administración (usuarios, ediciones, casetas, empleados, proveedores, entidades).
- **Gerente**: operativa diaria completa (turnos, asistencias, solicitudes, inventario, caja, entidades, administración salvo usuarios y ediciones críticas).
- **Cajero**: acceso a Turnos, Inventario y Caja en modo lectura/operativo limitado. No ve Asistencias, Solicitudes ni Entidades.

---

## 3. Conceptos clave

Antes de empezar, conviene tener claros estos términos:

- **Edición**: el año concreto de la feria (por ejemplo "Feria 2026"). Es la raíz de todo lo operativo: turnos, cierres, gastos y nóminas cuelgan de una edición. Solo una edición puede estar **activa** a la vez — es la que la app usa por defecto.
- **Caseta**: cada uno de los locales que se gestionan. Las casetas se mantienen entre ediciones (es el local físico, no el año).
- **Empleado**: una persona que trabaja en una caseta. Puede ser fijo (con jornal diario) o voluntario (sin jornal, vinculado a una entidad).
- **Voluntario**: un tipo concreto de empleado, con perfil `voluntario`. No cobra jornal y debe pertenecer a una entidad (hermandad, asociación, etc.).
- **Turno**: un tramo horario de trabajo en una caseta concreta. Puede cruzar la medianoche (por ejemplo, 20:00 → 02:00). Un turno tiene **plazas** esperadas por perfil (vigilante, trabajador, voluntario…) y **asignaciones** reales (qué empleados ocupan esas plazas).
- **Asistencia**: marca por empleado y turno indicando si efectivamente acudió al puesto.
- **Cierre diario**: el ingreso total de una caseta en una fecha concreta. Una vez **bloqueado**, queda inmutable salvo que un admin lo desbloquee.
- **Gasto**: cualquier salida de dinero de la edición. Puede asociarse a una caseta concreta o ser transversal (de la edición entera).
- **Nómina**: cálculo final de lo que cobra cada empleado fijo en una edición = días trabajados × jornal. Los voluntarios no aparecen.
- **Entidad de voluntarios**: catálogo de hermandades, asociaciones u organizaciones a las que pertenecen los voluntarios.
- **Solicitud de voluntario**: cuando un voluntario se apunta por el formulario público, su petición queda pendiente hasta que un gerente o admin la apruebe o rechace.

---

## 4. Por rol — flujos típicos

### Admin

Antes de la feria:

1. Crea o activa una **edición** en `/admin/ediciones`.
2. Da de alta o revisa las **casetas** en `/admin/casetas`.
3. Da de alta los **empleados** fijos en `/admin/empleados` (con su jornal).
4. Da de alta las **entidades** de voluntarios en `/admin/entidades`.
5. Da de alta los **proveedores** en `/admin/proveedores`.
6. Crea las **cuentas de usuario** del equipo en `/admin/usuarios` con su rol.
7. Publica el formulario público de voluntarios desde la ficha de la edición.

Durante la feria:

- Supervisa solicitudes pendientes en `/admin/solicitudes`.
- Resuelve incidencias (desbloquear cierres, editar gastos antiguos…).

Después de la feria:

- Calcula y marca como pagadas las **nóminas** en `/caja/nominas`.
- Revisa el **balance** en `/caja/balance`.

### Gerente

Día a día:

1. Planifica los turnos de la jornada en `/turnos` o `/turnos/semana`.
2. Asigna empleados a los turnos (y ajusta plazas).
3. Revisa solicitudes nuevas de voluntarios en `/admin/solicitudes` y aprueba/rechaza.
4. Marca asistencias al final del turno.
5. Registra gastos y entradas de inventario.

Al cerrar la feria:

- Exporta el listado de asistencias para nóminas o memoria.

### Cajero

Cada noche:

1. Crea el **cierre diario** de la caseta en `/caja/cierres/nuevo` con los ingresos del día.
2. Registra los **gastos** del día en `/caja/gastos/nuevo`.
3. Revisa que sus datos están bien antes de irse.

El cajero no puede modificar turnos ni el catálogo maestro.

---

## 5. Módulos

### 5.1. Turnos (`/turnos`)

Pantalla principal de planificación del personal por caseta y día.

- **`/turnos`** — vista de **un día** con el calendario de la caseta seleccionada. Permite navegar por fechas y elegir caseta. Si tienes permisos, puedes crear, editar y borrar turnos, y asignar empleados.
- **`/turnos/semana`** — vista semanal agregada, útil para tener una panorámica de toda la semana.
- **`/turnos/asistencias`** — listado agrupado por persona con los turnos a los que asistió. Filtros por edición, perfil, entidad y caseta. Solo admin y gerente.
- **`/turnos/asistencias/exportar`** — descarga del listado en CSV. Útil para nóminas y memoria.
- **`/turnos/imprimir`** — vista preparada para imprimir el cuadrante.

#### Cómo crear un turno

1. Ve a `/turnos`, selecciona la caseta y la fecha.
2. Pulsa "Nuevo turno".
3. Indica hora de inicio y hora de fin (puede cruzar medianoche).
4. Define las **plazas esperadas** por perfil (por ejemplo, 1 vigilante + 4 trabajadores + 2 voluntarios).
5. Guarda.

#### Cómo asignar empleados

1. Abre el turno desde el calendario.
2. Pulsa sobre el hueco vacío del perfil correspondiente.
3. Elige el empleado de la lista. La aplicación impide asignar a alguien que ya tenga otro turno solapado.

#### Cómo marcar asistencias

1. Abre el turno una vez ha tenido lugar.
2. Marca cada empleado como "asistió" o no.

#### Exportar asistencias a CSV

1. Ve a `/turnos/asistencias`.
2. Aplica los filtros (edición, perfil, entidad, caseta) que necesites.
3. Pulsa "Exportar CSV".
4. Se descargará un fichero con una fila por persona y los turnos asistidos.

---

### 5.2. Voluntarios

#### Formulario público (sin login)

Cada edición tiene un **token** único. Cuando un admin o gerente publica el formulario, se genera una URL del tipo:

```
/apuntarse/<token>
```

Esta URL es **pública** — se puede compartir por WhatsApp o redes sociales. Los voluntarios:

1. Abren el enlace.
2. Ven los turnos disponibles con huecos voluntario libres.
3. Rellenan: nombre, teléfono, entidad y los turnos en los que quieren participar.
4. Envían el formulario. Su solicitud queda **pendiente**.

Las solicitudes pendientes **reservan hueco** automáticamente (no se asigna doble por error).

#### Publicar / despublicar / rotar token

Desde la ficha de la edición en `/admin/ediciones/[id]`:

- **Publicar**: genera el token y abre el formulario.
- **Despublicar**: cierra el formulario. La URL deja de funcionar.
- **Rotar**: genera un token nuevo. El antiguo deja de servir (útil si se ha filtrado).

#### Aprobar o rechazar solicitudes

Como admin o gerente:

1. Ve a `/admin/solicitudes`.
2. Filtra por estado (pendiente, aprobada, rechazada, cancelada) o por edición.
3. Para cada solicitud verás el nombre, teléfono, entidad y los turnos pedidos.
4. Pulsa **Aprobar** para crear el empleado voluntario (si no existía) y asignarlo a los turnos.
5. Pulsa **Rechazar** para descartar la solicitud.

> Si el voluntario ya existía (por teléfono), la app reutiliza el empleado existente en lugar de duplicarlo.

#### Entidades de voluntarios

Gestión del catálogo en `/admin/entidades`:

- Crear, renombrar, activar y desactivar entidades.
- Las entidades desactivadas no aparecen en el formulario público pero se mantienen en empleados ya creados.

---

### 5.3. Inventario

Acceso desde `/inventario`. Submenús:

- **`/inventario/productos`** — catálogo de productos por caseta. Cada producto tiene nombre y unidad (unidad, kg, litro…).
- **`/inventario/stock`** — stock actual por caseta y producto.
- **`/inventario/movimientos`** — histórico de entradas y ajustes. Hay dos tipos:
  - **Entrada**: recepción de un pedido (suma stock).
  - **Ajuste**: corrección manual tras inventario físico.
- **`/inventario/pedidos`** — pedidos a proveedores. Cada pedido tiene estado (pendiente, recibido, cancelado), fecha de pedido, fecha de recepción y un detalle de productos con cantidades y precios.

#### Cómo registrar la llegada de un pedido

1. Ve a `/inventario/pedidos` y abre el pedido pendiente correspondiente.
2. Marca como recibido e introduce la fecha.
3. Al confirmar, los productos del pedido entran como movimientos de **entrada** y el stock se actualiza.

> No existen "salidas" por venta: la app no es una caja registradora. Las salidas reales se reflejan agregadas en el cierre diario.

---

### 5.4. Caja

Acceso desde `/caja`. Submenús:

#### Cierres diarios (`/caja/cierres`)

Listado de cierres por fecha y caseta de la edición activa.

Para crear un cierre:

1. Ve a `/caja/cierres/nuevo`.
2. Selecciona caseta y fecha.
3. Introduce los **ingresos totales** del día.
4. Añade notas si quieres.
5. Guarda.

Una vez creado, un admin o gerente puede **bloquear** el cierre. A partir de ese momento ya no se puede modificar salvo que un admin lo desbloquee.

#### Gastos (`/caja/gastos`)

Listado de gastos de la edición. Para registrar uno:

1. Ve a `/caja/gastos/nuevo`.
2. Indica descripción, monto, categoría y fecha.
3. Asocia opcionalmente a una caseta concreta (si lo dejas vacío, es un gasto transversal de la edición).
4. Guarda.

Los gastos quedan vinculados al usuario que los crea (auditoría).

#### Nóminas (`/caja/nominas`)

Cálculo automático por edición.

1. Pulsa **Calcular nóminas**. La app cuenta los días distintos en los que cada empleado **fijo** asistió a un turno y los multiplica por su jornal.
2. Revisa la tabla generada.
3. Marca cada nómina como **pagada** cuando la abones, indicando la fecha de pago.

> Los voluntarios no aparecen en nóminas (no cobran jornal).

#### Balance (`/caja/balance`)

Resumen económico de la edición activa: ingresos totales (suma de cierres), gastos por categoría y nóminas. Es la vista de cierre de feria.

---

### 5.5. Administración (gestión maestra)

Solo accesible para admin (y para gerente en partes operativas). Acceso desde `/admin`.

- **`/admin/ediciones`** — alta y edición de ediciones. Aquí se activa una edición y se publica el formulario público de voluntarios.
- **`/admin/casetas`** — alta de casetas (locales físicos), con nombre y ubicación. Las casetas pueden activarse o desactivarse.
- **`/admin/empleados`** — alta de empleados. Para empleados fijos se introduce el jornal diario. Para voluntarios se asocia a una entidad y no se introduce jornal.
- **`/admin/entidades`** — catálogo de entidades de voluntarios.
- **`/admin/proveedores`** — alta de proveedores para los pedidos de inventario.
- **`/admin/solicitudes`** — bandeja de solicitudes de voluntarios pendientes de revisar.
- **`/admin/usuarios`** — alta y edición de usuarios con cuenta (admin, gerente, cajero). Solo admin.

---

## 6. Preguntas frecuentes

**1. He creado un cierre con un importe equivocado y ya está bloqueado. ¿Qué hago?**
Pide a un administrador que lo desbloquee desde `/caja/cierres`. Una vez desbloqueado, podrás editarlo y volver a bloquearlo.

**2. Un voluntario se ha apuntado por el formulario pero no aparece en `/admin/empleados`.**
Es lo esperado. Los voluntarios solo se crean como empleados cuando **apruebas** la solicitud en `/admin/solicitudes`. Mientras esté pendiente o rechazada, no se crea ficha de empleado.

**3. ¿Por qué no puedo asignar a un empleado a un turno?**
Probablemente ya tiene otro turno que se solapa con ese horario. La aplicación bloquea las asignaciones que se pisarían. Revisa el calendario del empleado antes de insistir.

**4. He compartido la URL del formulario por WhatsApp y ahora me llegan apuntes raros. ¿Cómo cierro el grifo?**
Ve a la ficha de la edición en `/admin/ediciones/[id]` y pulsa **Despublicar**. La URL dejará de funcionar al instante. Si solo quieres invalidar la URL antigua y generar otra, pulsa **Rotar token**.

**5. Calculo las nóminas y veo días que no cuadran.**
La nómina cuenta los **días distintos** (no los turnos) en los que el empleado fue marcado como asistido. Si un empleado tiene dos turnos el mismo día, cuenta como un solo día. Revisa las asistencias en `/turnos/asistencias` filtrando por ese empleado.

**6. ¿Qué pasa con los datos al acabar el año?**
Nada se borra. Al crear y activar la edición del año siguiente, los turnos, cierres, gastos y nóminas nuevos cuelgan de la edición nueva. Las casetas, empleados, entidades y proveedores se mantienen entre años.

**7. Soy cajero y no veo el menú de Asistencias ni Solicitudes.**
Es correcto. Esos módulos están reservados a admin y gerente.

---

## 7. Glosario

- **Caseta**: local físico de la feria que se gestiona en la app.
- **Edición**: año concreto de la feria. Solo una edición está activa a la vez.
- **Empleado**: persona que trabaja en una caseta. Puede ser fijo o voluntario.
- **Voluntario**: empleado con perfil `voluntario`. No cobra jornal y pertenece a una entidad.
- **Entidad de voluntarios**: hermandad, asociación u organización a la que pertenece un voluntario.
- **Turno**: tramo horario de trabajo en una caseta. Puede cruzar la medianoche.
- **Plaza**: hueco esperado en un turno para un perfil concreto (ej. "necesito 2 trabajadores").
- **Asignación**: empleado concreto que ocupa una plaza de un turno.
- **Asistencia**: confirmación de que el empleado asignado realmente acudió.
- **Jornal diario**: pago por día trabajado de un empleado fijo.
- **Cierre diario**: ingreso total de una caseta en un día concreto.
- **Bloqueo**: marca un cierre como inmutable. Solo un admin lo puede desbloquear.
- **Gasto transversal**: gasto de la edición que no se asocia a una caseta concreta.
- **Nómina**: total a pagar a un empleado fijo en una edición = días trabajados × jornal.
- **Pedido**: compra a un proveedor. Cuando se recibe, sus productos entran al stock.
- **Movimiento de stock**: cambio en el stock. Tipos: entrada (recepción de pedido) o ajuste (corrección manual).
- **Solicitud de voluntario**: petición desde el formulario público pendiente de aprobación.
- **Token de formulario**: cadena de caracteres en la URL pública del formulario; rotable y revocable.
- **Rol**: nivel de permisos de un usuario con cuenta (admin, gerente, cajero).

---

## Última actualización

5 de mayo de 2026.

Si encuentras información desactualizada, avisa al administrador.
