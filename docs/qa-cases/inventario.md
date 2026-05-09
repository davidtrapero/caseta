# Casos QA — Inventario

Cobertura: productos, pedidos con stock atómico, recepción, ajustes manuales, movimientos.

---

### CASO-INV-001: Crear producto

**Rol**: admin
**Pasos**:
1. Login como admin
2. Navegar a `/inventario/productos/nuevo`
3. Caseta = "Caseta Test", nombre = "Cerveza test", unidad = "unidad"
4. Submit

**Aserciones**:
- Redirige a `/inventario/productos` y "Cerveza test" está en el listado

---

### CASO-INV-002: Ajuste manual de stock genera movimiento

**Rol**: gerente
**Precondición**: Producto "Cerveza test" creado.
**Pasos**:
1. Navegar a `/inventario/stock`
2. Click "Ajustar" en la fila de "Cerveza test"
3. Nueva cantidad = 10
4. Guardar ajuste

**Aserciones**:
- En `/inventario/movimientos` aparece "Cerveza test" con diferencia `+10`
- En `/inventario/stock` la cantidad actual es 10

---

### CASO-INV-003: Crear pedido y recibirlo aumenta stock atómicamente

**Rol**: gerente
**Precondición**: Producto "Cerveza test" stock 0; proveedor "Proveedor Test".
**Pasos**:
1. Navegar a `/inventario/pedidos`, "Nuevo pedido"
2. Proveedor = "Proveedor Test", añadir línea: producto "Cerveza test", cantidad 24
3. Submit (estado = pendiente)
4. Abrir pedido, click "Marcar como recibido"

**Aserciones**:
- Stock de "Cerveza test" pasa a 24
- En `/inventario/movimientos` hay un movimiento `+24` con tipo "recepción de pedido"

---

### CASO-INV-004: Editar pedido pendiente

**Rol**: gerente
**Precondición**: Pedido pendiente con 1 línea.
**Pasos**:
1. Abrir pedido, modificar cantidad de la línea
2. Submit

**Aserciones**:
- Cantidad actualizada en el detalle
- Stock NO cambia hasta que se recibe

---

### CASO-INV-005: NO se puede editar un pedido recibido

**Rol**: gerente
**Precondición**: Pedido en estado recibido (CASO-INV-003).
**Pasos**:
1. Abrir pedido recibido, intentar editarlo

**Aserciones**:
- Formulario en read-only o botón de guardar oculto

---

### CASO-INV-006: Productos inactivos no aparecen al crear pedido

**Rol**: gerente
**Precondición**: Producto "Cerveza test" marcado como inactivo desde admin.
**Pasos**:
1. Crear nuevo pedido
2. Buscar "Cerveza test" en el selector de productos

**Aserciones**:
- "Cerveza test" no aparece en las opciones disponibles

---

### CASO-INV-007: Listado de movimientos filtrable por caseta

**Rol**: gerente
**Precondición**: Movimientos de varios productos.
**Pasos**:
1. Navegar a `/inventario/movimientos`
2. Aplicar filtro de caseta

**Aserciones**:
- Solo aparecen movimientos de la caseta seleccionada
