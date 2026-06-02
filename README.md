# 🏢 Stanza Malaga - Sistema de Administración Residencial

## 🏛️ Sección Almería - Residencial

Sistema completo y robusto para la gestión y administración interna del residencial **Stanza Malaga Sección Almería**, permitiendo controlar las finanzas, reservación de áreas comunes, bitácora de proyectos y gestión de residentes de manera eficiente.

---

## 🚀 Características Principales

### 👥 **Gestión de Residentes y Usuarios**
- **👑 Administrador / Mesa Directiva**: Control total del sistema, gestión de usuarios, asignación de permisos y reportes generales.
- **👤 Residente / Propietario**: Acceso para solicitar reservaciones de áreas comunes, consultar el balance de cuotas de su propiedad y ver avisos del residencial.
- **🔒 Seguridad / Guardia**: Control de acceso a la cerrada y consulta de bitácora básica.

### 💳 **Balance de Cuotas de Mantenimiento**
- Registro y control del flujo de caja (ingresos por cuota y egresos/gastos administrativos).
- Clasificación de transacciones por concepto, forma de pago (Transferencia, Efectivo, Tarjeta, Depósito) y período de vigencia (Mes/Año).
- Estatus de pagos en tiempo real: **PAGADO**, **PENDIENTE**, **EN CONCILIACIÓN**, o **RECHAZADO**.
- Exportación del libro de caja a Excel.

### 📅 **Reservación de Áreas Comunes**
- Seguimiento visual de reservaciones y solicitudes de áreas comunes (Alberca, Terraza, etc.).
- Control de cuotas de reservación (Sin cuota, cuota de $1,500, cuota especial).
- Gestión de estatus: **Solicitado**, **Confirmado**, **Realizado** y **Cancelado**.
- Generación automática de comprobantes en PDF listos para firmar.

### 🏗️ **Bitácora de Actividades y Proyectos**
- Registro y planeación presupuestaria para obras y proyectos dentro de la privada.
- Seguimiento de estados: Por Hacer, En Progreso, En Revisión y Completado.
- Documentos de cotización y respaldo adjuntos a cada proyecto para transparencia total.
- Control del presupuesto ejecutado vs presupuesto pendiente.

---

## 🛠️ Tecnologías Utilizadas

### **Frontend**
- **React 18** con TypeScript
- **Vite** como bundler y dev server optimizado
- **CSS Modules** para estilos completamente encapsulados
- **React Router DOM** para manejo de navegación y rutas seguras
- **Lucide React** para iconografía premium y moderna

### **Backend**
- **Node.js** con Koa Framework
- **Sequelize ORM** para interacción robusta con base de datos
- **PostgreSQL** para almacenamiento de datos relacionales estable
- **JWT** para autenticación segura de residentes y administradores
- **PDFKit** para la generación dinámica de comprobantes de reserva

---

## 📋 Instalación y Configuración

### **Prerrequisitos**
- Node.js 18 o superior
- npm o yarn
- Base de datos PostgreSQL instalada y activa

### **1. Clonar e Instalar**
```bash
# Instalar dependencias del frontend
cd frontend
npm install

# Instalar dependencias del backend
cd ../backend
npm install
```

### **2. Configurar Variables de Entorno**
Asegura que tu archivo `.env` contenga las credenciales correctas de base de datos y la URL de la API:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stanza_malaga_db
DB_USER=postgres
DB_PASSWORD=tu_contrasena
```

### **3. Iniciar el Entorno de Desarrollo**
```bash
# Iniciar frontend (correrá en el puerto 3000)
cd frontend
npm run dev

# Iniciar backend (correrá en el puerto 30001)
cd ../backend
npm run dev
```

---

## 📁 Estructura del Proyecto

```
Stanza Malaga/
├── frontend/             # Código de la aplicación web de React
│   ├── src/
│   │   ├── components/   # Componentes modulares (Sidebar, Tablas, Modales)
│   │   ├── pages/        # Dashboard, Recaudación (Equipos), Reservaciones (Tickets), Reportes
│   │   ├── services/     # Clientes de API y conexiones de servicios
│   │   └── types/        # Definiciones y tipados TypeScript
├── backend/              # API REST de Node.js + Koa
│   ├── src/
│   │   ├── controllers/  # Controladores de negocio (usuarios, pagos, reservaciones)
│   │   ├── models/       # Modelos relacionales de Sequelize (User, Equipment, Ticket)
│   │   ├── migrations/   # Control de versiones del esquema de base de datos
│   │   └── app.js        # Configuración principal del servidor de Koa
```

---

## 🎨 UI/UX y Diseño
- **Estilo Moderno**: Interfaz premium, limpia y altamente responsive optimizada para computadoras y dispositivos móviles.
- **Acceso Granular**: La visualización y los menús cambian automáticamente según el rol del residente logueado (Admin, Presidente, Tesorero, Residente).

---

**🏢 Stanza Malaga - Innovando la administración residencial. 🎉**