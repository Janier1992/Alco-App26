# Módulo de Gestión de Proyectos (Kanban)

Este módulo implementa un tablero Kanban dinámico para la gestión de tareas, requerimientos y mantenimiento, integrado con Supabase para persistencia y almacenamiento.

## Arquitectura (SOLID & Clean Code)

El módulo ha sido refactorizado para separar responsabilidades de la siguiente manera:

### 1. Capa de Datos (Data Layer)
- **`projectService.ts`**: Centraliza todas las llamadas a la base de datos (tablas `board_tasks`, `task_labels`, etc.) y al storage. No contiene lógica de UI ni manejo de estado de React.

### 2. Capa de Lógica de Negocio (Logic Layer)
- **`useProjectsBoard.ts`**: Hook personalizado que gestiona el estado del tablero, carga de datos inicial y orquesta las operaciones CRUD. Actúa como puente entre la UI y el servicio.

### 3. Capa de Presentación (UI Layer)
- **`Projects.tsx`**: Contenedor principal que define el layout del tablero.
- **`ProjectCard.tsx`**: Renderiza una tarjeta individual.
- **`TaskDetailModal.tsx`**: Modal complejo para la edición de detalles, checklists y comentarios.
- **`CreateTaskModal.tsx`**: Formulario simple para la creación de nuevas tareas.
- **`CameraModal.tsx`**: Interfaz de acceso a la cámara para capturar evidencia en campo.

## Funciones Principales

- `getTasksWithDetails`: Recupera tareas con todas sus relaciones (etiquetas, responsables, etc.).
- `createTask`: Inserta una nueva tarea en una columna específica.
- `toggleLabel`: Añade o elimina etiquetas de forma reactiva.
- `toggleMember`: Gestiona la asignación de responsables de calidad.
- `uploadAttachment`: Sube archivos/fotos al bucket `project-attachments` y registra la URL.
- `moveTask`: Actualiza la columna y posición de una tarea (Drag & Drop).

## Mantenimiento y Extensibilidad

Para añadir una nueva funcionalidad al modal:
1. Añade el campo a la interfaz `Task` en `types.ts`.
2. Actualiza `projectService.ts` para manejar el nuevo campo.
3. Incorpora el control de UI en `TaskDetailModal.tsx`.
