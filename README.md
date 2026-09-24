# Sistema de Control Operativo - Cruz Roja Salvadoreña (Seccional Guazapa)

Plataforma web administrativa desarrollada en Next.js y Tailwind CSS, sincronizada en tiempo real con la base de datos Firestore de la aplicación móvil nativa. Este sistema permite la digitalización de la logística de ambulancias, control de personal y generación de reportes.

##  Registro de Contribuciones y Avances

### Kevin Alvarado (Arquitectura y Módulos Base)
* **Arquitectura del Sistema:** Configuración inicial del proyecto con Next.js y Tailwind CSS.
* **Integración de Base de Datos:** Conexión centralizada con Firebase Firestore (`firebase.ts`).
* **Autenticación y Seguridad:** Implementación del inicio de sesión dinámico consultando directamente los carnets en la colección `usuarios` y persistencia de sesión mediante `localStorage`.
* **Panel de Control (Dashboard):** Desarrollo de la interfaz principal con lectura en tiempo real para el perfil del usuario activo y la tabla de líderes.
* **Control de Accesos (RBAC):** Sistema de filtrado inteligente que muestra u oculta módulos operativos dependiendo del rol del usuario (Superadmin, Administrador, Jefe de Brigada, Voluntario).
* **Calendario Operativo:** Creación del algoritmo matemático para calcular la rotación infinita de brigadas (B1 a B4) y la asignación automática de la brigada de apoyo (B5) en fines de semana.
* **Maquetación:** Diseño base del formulario de Control de Combustible.
* 
* ### Módulos Administrativos y Generación de Reportes (Fase Final)

* **Panel de Super Administrador:** Dashboard ejecutivo diseñado con colores institucionales. Incluye un motor de gráficos estadísticos creado con código nativo, un sistema de alertas tempranas para el monitoreo de inasistencias de voluntarios y una tabla de control (semáforo) exportable a Excel y PDF.
* **Automatización de Informes Mensuales:** Algoritmo avanzado que cruza las bases de datos de `registro_horas` y `bitacora_atenciones` para auto-completar estadísticas. Genera el documento oficial de Cruz Roja en formato PDF  listo para firma.
* **Centro de Servicio Social:** Plataforma integral para la gestión de estudiantes de horas sociales. Permite llevar un control de progreso (meta de 150 hrs), toma de asistencia rápida, registro histórico inmutable y exportación dual de reportes (CSV compatible con Excel y PDF formal).


### Norma García (Interacción de Archivos y Módulo Logístico)
* **Gestión de Evidencia Fotográfica:** Configuración del input oculto y diseño del botón para tomar o adjuntar la foto del ticket/recibo desde el dispositivo del usuario.
* **Persistencia de Registros:** Implementación de la función para recolectar los datos del formulario (unidad, kilometraje, monto, nombre de foto) y guardar los cambios creando un nuevo registro exitoso en la colección `control_combustible` de la base de datos.

##  Tecnologías Utilizadas
* **Frontend:** React, Next.js (App Router), Tailwind CSS.
* **Backend / BaaS:** Firebase Firestore (Base de datos NoSQL en tiempo real).
* **Lenguaje:** TypeScript / JavaScript.
