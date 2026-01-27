Documento de Contexto: ERP Operativo FISE (Gestión de Instalaciones de Gas)
1. Visión General
Este sistema tiene como objetivo digitalizar el flujo de trabajo de una empresa instaladora de gas bajo el programa FISE. La aplicación debe gestionar la trazabilidad completa de un cliente, desde la captura del vendedor hasta la habilitación final del servicio, asegurando la integridad de las evidencias (fotos y fechas) para auditorías.

2. Flujo de Trabajo (Pipeline de Estados)
El sistema opera como un embudo de estados lineales:

Captación (Vendedor): Crea el registro con datos básicos, DNI y foto de fachada. (Estado FISE: Pendiente).

Validación (Admin/Tú): Revisión del contrato. Al aprobarlo (Estado FISE: Aprobado), el sistema debe disparar automáticamente el Estado Operativo a Por Instalar.

Instalación (Técnico): El técnico visualiza su lista de "Por Instalar", realiza el trabajo, sube fotos de evidencia y marca como Instalado.

Habilitación (Habilitador): El habilitador visualiza lo "Instalado", sube el acta final y marca como Habilitado. Este estado cierra el ciclo financiero.

3. Requerimientos de Datos (Esquema en Supabase)
El agente debe generar una base de datos relacional con las siguientes entidades:

Tabla clientes_operaciones:

id_dni (PK): Identificador único.

vendedor_nombre: Nombre del captador.

datos_cliente: Nombre, celular, dirección.

estados: estado_fise (Enum) y estado_operativo (Enum).

fechas_log: Timestamps para cada cambio de estado (Aprobación, Instalación, Habilitación).

evidencias_storage: URLs de fotos (Fachada, Instalación, Acta).

Tabla control_materiales: Relacionada por id_dni para calcular costos de materiales por instalación.

4. Lógica de Negocio Crítica (Triggers)
Automatización de Fechas: Al cambiar un estado a "Instalado" o "Habilitado", el campo fecha_correspondiente debe llenarse con el current_timestamp del servidor.

Cálculo de Comisiones: La utilidad se calcula restando el costo_materiales (de la tabla materiales) al ingreso bruto por instalación, filtrado por el mes de la fecha_habilitacion.

5. Perfiles de Usuario y Permisos (RLS)
Administrador: Acceso total, dashboard de rentabilidad y edición de estados FISE.

Técnico: Acceso de lectura/escritura limitado a su lista asignada y solo cuando el estado sea Por Instalar.

Habilitador: Acceso de lectura/escritura limitado a registros en estado Instalado.

6. Salida Esperada en Antigravity
Esquema SQL para Supabase.

Configuración de Buckets en Supabase Storage para fotos de alta resolución.

Frontend PWA React/Next.js con componentes de cámara integrados.

Dashboard con gráficos de barras para: "Servicios Habilitados por Mes" y "Utilidad Neta".