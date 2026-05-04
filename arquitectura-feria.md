# Proyecto: App de gestión de casetas de feria

## Contexto del proyecto

Aplicación web de **uso privado y sin fines comerciales** para gestionar la operativa de casetas de feria de comida y bebida. El objetivo es digitalizar tres áreas clave: turnos de trabajo, inventario y facturación.

---

## Requisitos funcionales principales

- **Gestión de turnos**: asignación de empleados por caseta, horarios, control de presencia.
- **Gestión de inventario**: productos, stock, entradas y salidas.
- **Facturación**: registro de ventas, generación de facturas o tickets, resumen de caja.

---

## Perfil técnico del desarrollador

- Fullstack con experiencia en **Java** (Spring Boot, Spring MVC) y **JavaScript** (Node.js/Express, Angular).
- Preferencia por **fullstack unificado** (un solo framework para backend y frontend).
- El desarrollo se realizará mediante **vibe coding con Claude Code**.

---

## Decisiones de infraestructura

### Hosting recomendado: Railway

| Plataforma | Plan gratuito | Ventaja clave | Limitación |
|---|---|---|---|
| **Railway** ⭐ | $5 crédito/mes | PostgreSQL incluida, sin sleep, deploy desde GitHub | Crédito limitado (suficiente para uso privado) |
| Render | Web service gratuito | Plataforma madura y fiable | BD caduca a 90 días, sleep tras 15 min |
| Fly.io | 3 VMs + 3 GB storage | Sin caducidad real, mayor control | Requiere Docker y CLI, más técnico |

**Decisión:** Railway como primera opción. Para uso privado con baja carga (2-5 usuarios simultáneos), los $5/mes de crédito no se agotan en condiciones normales.

**Base de datos:** Se recomienda combinar Railway con **Supabase** (PostgreSQL gratuito y sin caducidad) para mayor robustez y panel de administración visual.

---

## Arquitectura recomendada

### Opción 1 — Recomendada: Next.js + Prisma + PostgreSQL

**Stack completo:**
- **Next.js 14** con App Router
- **Server Actions** (API sin boilerplate REST separado)
- **Prisma ORM** (esquema como fuente de verdad única)
- **PostgreSQL** vía Supabase o Railway
- **NextAuth.js** para autenticación
- **Tailwind CSS** para estilos
- **TypeScript** end-to-end

**Por qué es la opción principal:**
- Un solo repositorio, un solo deploy.
- Los Server Actions eliminan la necesidad de definir endpoints REST para operaciones CRUD estándar.
- Prisma genera tipos TypeScript automáticamente desde el esquema, reduciendo errores.
- Es el stack con **mayor densidad de entrenamiento en Claude Code**: descripciones de funcionalidades producen código funcional con menos correcciones.
- Compatible con Railway, Vercel y Render.

**Hosting:** Railway (backend + BD) o Railway + Supabase (BD externa).

---

### Opción 2 — Zona de confort: Spring Boot + Angular

**Stack completo:**
- **Spring Boot 3** + Spring Data JPA
- **Spring Security + JWT**
- **Angular 17+** con Angular Material
- **PostgreSQL**
- **OpenAPI / Swagger** para documentación de API

**Cuándo elegirla:**
- Si se prioriza la solidez arquitectónica y el dominio del stack sobre la velocidad de generación de código.
- Si la lógica de negocio es suficientemente compleja para justificar la estructura de Spring.

**Limitaciones en free tier:**
- Requiere **dos deploys** (backend Java + frontend Angular), lo que consume más recursos gratuitos.
- La JVM de Spring Boot consume ~400-500 MB en reposo, ajustado al límite de 512 MB de Railway/Render.
- Mitigación posible: usar **Quarkus** en modo nativo para reducir huella de memoria (añade complejidad de build).

**Hosting:** Railway (Java) + Vercel o Netlify (Angular), o Fly.io para ambos en contenedores.

---

### Opción 3 — Alternativa ligera: Nuxt 3 + Nitro + Drizzle

**Stack completo:**
- **Nuxt 3** (Vue 3 Composition API)
- **Nitro** como servidor integrado (sin Express separado)
- **Drizzle ORM** (más rápido que Prisma, menos RAM)
- **PostgreSQL** o **SQLite**
- **Nuxt UI**
- **TypeScript**

**Cuándo elegirla:**
- Si se quiere el menor consumo de memoria posible en hosting gratuito.
- Si se prefiere Vue sobre React.

**Limitaciones:**
- Menor corpus de entrenamiento en Claude Code respecto a Next.js.
- Ecosistema más pequeño, menos ejemplos de apps similares disponibles.

**Hosting:** Railway, Render o Fly.io.

---

## Comparativa de frameworks para vibe coding con Claude Code

| Criterio | Next.js + Prisma | Spring Boot + Angular | Nuxt 3 + Drizzle |
|---|---|---|---|
| Repos necesarios | 1 | 2 | 1 |
| Eficacia con Claude Code | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Consumo RAM free tier | Bajo | Alto (JVM) | Muy bajo |
| Curva de aprendizaje | Media (App Router) | Baja (stack conocido) | Media (Vue) |
| Velocidad de desarrollo | Alta | Media | Alta |
| Escalabilidad futura | Alta | Muy alta | Media |

---

## Próximos pasos sugeridos

1. **Confirmar stack**: Next.js + Prisma es la recomendación para vibe coding.
2. **Definir modelo de datos**: entidades principales — `Caseta`, `Empleado`, `Turno`, `Producto`, `Factura`.
3. **Inicializar proyecto**: `npx create-next-app@latest feria-app --typescript --tailwind --app`
4. **Configurar Prisma**: `npx prisma init` y definir el schema según el modelo de datos.
5. **Conectar base de datos**: crear proyecto en Supabase o Railway y configurar `DATABASE_URL`.
6. **Deploy inicial**: conectar repositorio GitHub a Railway para CI/CD automático.

---

## Notas para Claude Code

- El proyecto es de **uso privado**, por lo que la seguridad puede ser básica (NextAuth con un único usuario o lista cerrada de usuarios).
- Se espera un máximo de **2-5 usuarios simultáneos**, no es necesario optimizar para alta concurrencia.
- El desarrollo es por **vibe coding**: proporcionar descripciones funcionales completas por módulo (ej: "pantalla de gestión de turnos con calendario semanal, asignación de empleados por caseta y guardado automático").
- Mantener el esquema de Prisma como fuente de verdad: cualquier cambio de modelo empieza en `schema.prisma`.
