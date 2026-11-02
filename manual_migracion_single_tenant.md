# ALL-crm: Manual Maestro de Migración, Arquitectura y Despliegue Personalizado (Single-Tenant)

Este documento contiene la **especificación técnica, arquitectura de datos, flujos de automatización por WhatsApp y el protocolo paso a paso** para clonar, migrar y desplegar este sistema para un cliente único y exclusivo (sin necesidad del panel `/admin` multi-tenant, accediendo directamente vía `/login`).

---

## 1. Visión General del Sistema: ¿Qué Hace Este Proyecto?

**ALL-crm** es una plataforma táctica de **fidelización, retención, monedero digital (cashback) y auditoría de calidad** diseñada específicamente para gimnasios con o sin tienda de retail.

### 🔑 Propuesta de Valor Clave
1. **Cero Apps para el Socio:** El cliente final interactúa **exclusivamente por WhatsApp** escaneando códigos QR en el gimnasio o mostrador. No necesita descargar apps ni recordar contraseñas.
2. **Interacción Centralizada en Monitor ("Zero-Jump"):** El monitor de recepción es el centro de mando táctico. Muestra códigos QR dinámicos para que el socio escanee y procese pagos o canjes. No hay saltos de página ni tablas densas; todo el detalle se inspecciona mediante **Drawers laterales contextuales**.
3. **Control Total en Caja:** Cuando un socio solicita pagar o canjear saldo, el bot **no cobra automáticamente**; envía una solicitud en tiempo real al panel de recepción para que el staff **apruebe o rechace** con un solo clic.
4. **Reputación y Google Reviews Automatizado:** Si un cliente califica a su coach con **5 Estrellas**, el bot le envía de inmediato el enlace directo a **Google Reviews**. Si califica con 1 a 4 estrellas, no muestra Google; pide un comentario privado interno para auditoría.

---

## 2. Los 4 Flujos Operativos y de Negocio

```mermaid
flowchart TD
    A[Socio escanea QR en Gimnasio] --> B{Tipo de Código QR}
    
    B -->|EVAL-XXXX| C[Flujo 1: Calificación de Coach]
    C --> C1[Bot lista Coaches activos]
    C1 --> C2[Socio califica 1 a 5 estrellas]
    C2 -->|5 Estrellas| C3[Guarda calificación + Enlace a Google Reviews]
    C2 -->|1 a 4 Estrellas| C4[Pide comentario privado interno para auditoría]
    
    B -->|MEM-XXXX| D[Flujo 2: Pago de Mensualidad]
    D --> D1[Solicitud llega a Panel en Recepción]
    D1 --> D2{Staff Aprueba?}
    D2 -->|Rechazar| D3[Bot avisa rechazo al cliente]
    D2 -->|Aprobar| D4[Bot despliega catálogo de planes]
    D4 --> D5[Cliente paga y se acredita Cashback % a su Billetera]
    
    B -->|RET-XXXX| E[Flujo 3: Tienda Retail / Barra]
    E --> E1[Solicitud llega a Panel en Recepción]
    E1 --> E2[Staff aprueba en caja]
    E2 --> E3[Suma cashback por compras de productos]
    
    F[Dueño / Recepción en /dashboard/billetera] --> G[Flujo 4: Canjes en Monedero]
    G --> G1[Selecciona socio en Drawer Zero-Jump]
    G1 --> G2[Descuenta hasta el 100% de una compra o mensualidad]
```

---

## 3. Arquitectura de las 4 Pantallas Tácticas

Al ser una versión personalizada para un cliente final, el acceso se realiza por **`/login`** y cuenta con 4 módulos principales:

### 1. Resumen General (`/dashboard`)
- **Customer Interaction Card:** Búsqueda rápida por nombre o WhatsApp, tarjeta estilo performance deportivo con saldo gigante en cian (`$ 12.50 USD`), tag `VIP Gold` y botón de **Historial Popout (Drawer)**.
- **Quick Actions:** Tarjetas inmersivas (*Pagar Cuota Mensual*, *Canjear en Barra*, *Calificar Coach*) con botón central de **Escanear QR**.
- **Panel de Verificación de Pagos en Tiempo Real:** Lista los pagos pendientes de comprobación con botones directos de `[ Aprobar ]` y `[ Rechazar ]`.

### 2. Liga de Performance & Clientes (`/dashboard/evaluaciones`)
- **Podio Top 3:** Reconocimiento visual a los 3 mejores entrenadores con medallas de oro, plata y bronce, promedio de estrellas y barras de rendimiento.
- **Ranking Minimalista:** Lista compacta con barras segmentadas en color cian.
- **Directorio VIP de Clientes:** Tabla limpia con badges de membresía activa/inactiva y Drawer lateral para ver historial de cuotas y compras.

### 3. Billetera Fintech VIP (`/dashboard/billetera`)
- **Contador de Cashback Total Disponible:** Suma matemática en vivo de todos los fondos de fidelización.
- **Túnel de Canje Instantáneo:** Botones rápidos de QR para mostrador.
- **Auditoría de Saldos:** Listado de todos los socios con su cashback y Drawer para procesar canjes manuales al instante.

### 4. Centro de Mando & Configuración (`/dashboard/configuracion`)
- **Instancia WhatsApp:** Vinculación con botón `Instant QR Link`, modal inmersivo de alta definición, botón de **`REINICIAR / ACTUALIZAR QR`** y auto-detección de enlace en tiempo real.
- **Comisiones Zero-Jump:** Drawer lateral con sliders deslizantes para regular:
  - `% Comisión por Cuota de Gym` (ej. 10%).
  - `% Comisión por Tienda Retail` (ej. 5%).
  - `Umbral de días de inactividad` para alertas de "Te extrañamos".
- **Gestión de Coaches y Planes:** Agregar/eliminar entrenadores y planes de precios.

---

## 4. Stack Tecnológico

| Capa | Tecnología | Función |
|---|---|---|
| **Framework Fullstack** | Next.js 16 (App Router, Turbopack) | Frontend reactivo y endpoints API Serverless |
| **Estilos & UI** | Tailwind CSS v4 + Lucide Icons | Estética táctica, efectos glass, gradientes fitness |
| **Capa de Datos** | Prisma ORM + MySQL | Base de datos relacional y queries tipadas |
| **Autenticación** | JWT vía `jose` + Cookies HTTP-Only | Seguridad de sesión sin contraseñas expuestas en cliente |
| **Canal WhatsApp** | Evolution API v2 (Baileys) | Conexión WebSocket/QR con WhatsApp y webhooks entrantes |
| **Códigos QR** | `qrcode.react` | Renderizado nativo vectorial y matricial en monitor |
| **Notificaciones** | Web Push VAPID API | Alertas sonoras e instantáneas al navegador y celular PWA |

---

## 5. Variables de Entorno Requeridas (`.env`)

Para desplegar esta instancia personalizada, debes configurar las siguientes variables:

```env
# 1. Base de datos MySQL
DATABASE_URL="mysql://usuario:password@host_servidor:puerto/nombre_base_datos"

# 2. Conexión con Evolution API (WhatsApp)
EVOLUTION_API_URL="http://IP_O_DOMINIO_EVOLUTION:8080"
EVOLUTION_API_KEY="TU_API_KEY_DE_EVOLUTION"
WEBHOOK_URL="https://tu-dominio-vercel.app/api/webhook/whatsapp"

# 3. Seguridad y Sesiones JWT
JWT_SECRET="clave_secreta_super_segura_de_al_menos_32_caracteres"

# 4. Notificaciones WebPush PWA (Opcional pero recomendado)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="TU_VAPID_PUBLIC_KEY"
VAPID_PRIVATE_KEY="TU_VAPID_PRIVATE_KEY"
VAPID_SUBJECT="mailto:contacto@tu-gimnasio.com"
```

> [!TIP]
> Para generar nuevas claves VAPID en caso de requerirlas, puedes ejecutar en tu terminal:
> `npx web-push generate-vapid-keys`

---

## 6. Esquema de Base de Datos Esencial (Prisma)

El modelo de datos central que gobierna este sistema single-tenant:

```prisma
model Tenant {
  id                      String         @id @default(uuid())
  name                    String
  slug                    String         @unique
  referralCommPct         Decimal        @default(10.00) @db.Decimal(5, 2)
  storeReferralCommPct    Decimal        @default(5.00) @db.Decimal(5, 2)
  currency                String         @default("USD")
  whatsappPhone           String?
  googleReviewUrl         String?        // Enlace de Google Maps Reviews
  inactivityThresholdDays Int            @default(14)
  isActive                Boolean        @default(true)
  showOverviewTab         Boolean        @default(true)
  showEvaluationsTab      Boolean        @default(true)
  showWalletTab           Boolean        @default(true)
  showConfigTab           Boolean        @default(true)
  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt

  businessUnits           BusinessUnit[]
  branches                Branch[]
  wallets                 Wallet[]
  customers               Customer[]
  staff                   Staff[]
  evaluations             Evaluation[]
  payments                Payment[]
  qrTokens                QrToken[]
  membershipPlans         MembershipPlan[]
}

model Staff {
  id           String   @id @default(uuid())
  tenantId     String
  name         String
  email        String   @unique // Usuario de acceso para el dueño
  passwordHash String
  role         String   @default("OWNER") // OWNER | TRAINER | MANAGER
  isActive     Boolean  @default(true)
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model Customer {
  id               String       @id @default(uuid())
  tenantId         String
  name             String
  phone            String       // WhatsApp del socio
  membershipActive Boolean      @default(false)
  membershipExpiry DateTime?
  wallets          Wallet[]
  evaluations      Evaluation[]
  tenant           Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model Wallet {
  id           String              @id @default(uuid())
  tenantId     String
  customerId   String
  balance      Decimal             @default(0.00) @db.Decimal(10, 2)
  customer     Customer            @relation(fields: [customerId], references: [id], onDelete: Cascade)
  transactions WalletTransaction[]
  tenant       Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model QrToken {
  id        String   @id @default(uuid())
  tenantId  String
  type      String   // EVALUATION | MEMBERSHIP | RETAIL
  token     String   @unique
  expiresAt DateTime
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

---

## 7. Protocolo Paso a Paso para Mudanza / Despliegue en un Nuevo Proyecto

Sigue esta lista de verificación para desplegar el sistema en un nuevo hosting/Vercel:

### Paso 1: Clonar y Limpiar Repositorio
1. Crea un nuevo repositorio privado en GitHub (ej. `fidelizacion-cliente-final`).
2. Clona el proyecto actual en una nueva carpeta o ajusta el remote:
   ```bash
   git remote set-url origin https://github.com/TU_USUARIO/TU_NUEVO_REPO.git
   ```
3. Si deseas eliminar el panel de superadministrador `/admin`:
   - Puedes eliminar o proteger la carpeta `src/app/admin` y su endpoint `src/app/api/admin`.
   - El acceso del cliente final será directamente en **`/login`**.

### Paso 2: Crear y Poblar la Base de Datos MySQL
1. Crea una base de datos MySQL vacía (en Supabase, Railway, StackCP, PlanetScale o VPS).
2. Coloca la URL de conexión en tu `.env` (`DATABASE_URL`).
3. Empuja la estructura con Prisma:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
4. Ejecuta el script de semilla (Seed) para crear el tenant, el usuario del cliente y los entrenadores iniciales:
   ```bash
   npx tsx prisma/seed.ts
   ```
   *(Modifica `prisma/seed.ts` previamente con el nombre del gimnasio del cliente y su contraseña deseada).*

### Paso 3: Conectar la Instancia de WhatsApp en Evolution API
1. Asegúrate de tener una instancia de Evolution API corriendo.
2. La aplicación utiliza el nombre de instancia `'default'` o el slug configurado.
3. Despliega el proyecto en Vercel y añade la variable `WEBHOOK_URL`:
   ```
   WEBHOOK_URL=https://tu-nuevo-dominio.vercel.app/api/webhook/whatsapp
   ```
4. El sistema configurará el webhook automáticamente la primera vez que el cliente abra su panel, o puedes registrarlo ejecutando una llamada `POST` a:
   `http://TU_EVOLUTION:8080/webhook/set/default` con `{ url: "https://tu-nuevo-dominio.vercel.app/api/webhook/whatsapp", enabled: true, events: ["MESSAGES_UPSERT"] }`.

### Paso 4: Despliegue en Vercel
1. Ve a [vercel.com](https://vercel.com) e importa el nuevo repositorio de GitHub.
2. En la sección **Environment Variables**, añade todas las variables detalladas en la Sección 5.
3. En **Build Settings**:
   - Framework Preset: `Next.js`
   - Build Command: `next build`
   - Output Directory: `.next`
4. Haz clic en **Deploy**.

### Paso 5: Entrega al Cliente
1. Dale al cliente el enlace: `https://tu-nuevo-dominio.vercel.app/login`.
2. Proporciónale su usuario y contraseña (creados en el seed).
3. Pídele que entre a **Centro de Mando** (`/dashboard/configuracion`), presione **`Instant QR Link`** y escanee el código con el WhatsApp oficial del gimnasio.
4. ¡El sistema quedará 100% operativo y automatizado de por vida!
