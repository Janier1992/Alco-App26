/**
 * @file useProjectsBoard.ts
 * @description Custom hook to manage the state and logic of the Projects Kanban Board.
 * @module hooks/projects
 * @author Antigravity Architect
 */

import { useState, useEffect, useCallback } from 'react';
import { projectService } from '../../services/projects/projectService';
import { useNotification } from '../../components/NotificationSystem';
import type { Column, Task, Priority, Label, UserAvatar } from '../../types';

export const useProjectsBoard = (boardType: string = 'projects') => {
    const [columns, setColumns] = useState<Record<string, Column>>({});
    const [loading, setLoading] = useState(true);
    const [boardId, setBoardId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const { addNotification } = useNotification();

    /**
     * Loads the board data, columns, and tasks.
     */
    const loadBoardData = useCallback(async () => {
        try {
            setLoading(true);
            let bId = boardId;

            if (!bId) {
                const board = await projectService.getBoardByType(boardType);
                if (board) {
                    bId = board.id;
                    setBoardId(bId);
                } else {
                    addNotification({ type: 'warning', title: 'Tablero no encontrado', message: `No se encontró un tablero de tipo ${boardType}` });
                    setLoading(false);
                    return;
                }
            }

            if (!bId) return;

            let cols = await projectService.getColumnsByBoardId(bId);

            // Create default columns if none exist
            if (cols.length === 0) {
                cols = await projectService.createDefaultColumns(bId, ['Pendiente', 'En Proceso', 'Completado']);
            }

            const colsMap: Record<string, Column> = {};
            cols.forEach(c => {
                colsMap[c.id] = { id: c.id, title: c.title, tasks: [] };
            });
            // Hydrate cols early so UI displays lists correctly even if tasks fail
            setColumns(colsMap);

            const colIds = cols.map(c => c.id);
            const tasks = await projectService.getTasksWithDetails(colIds);

            tasks.forEach((t: any) => {
                if (colsMap[t.column_id]) {
                    colsMap[t.column_id].tasks.push({
                        id: t.id,
                        title: t.title,
                        description: t.description || '',
                        priority: t.priority as Priority,
                        dueDate: t.due_date,
                        labels: t.labels || [],
                        assignedUsers: t.assignedUsers?.map((u: any) => ({
                            id: u.user_id || u.id,
                            initials: u.user_initials || '??'
                        })) || [],
                        checklist: t.checklist || [],
                        attachments: t.attachments || [],
                        comments: t.comments?.map((c: any) => ({
                            id: c.id,
                            author: c.author_name || 'Desconocido',
                            text: c.content,
                            date: new Date(c.created_at).toLocaleDateString()
                        })) || [],
                        assetId: t.asset_id,
                        type: t.maintenance_type,
                        column_id: t.column_id
                    });
                }
            });

            setColumns({ ...colsMap });
        } catch (error: any) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error de Datos', message: error.message });
        } finally {
            setLoading(false);
        }
    }, [boardType, boardId, addNotification]);

    useEffect(() => {
        loadBoardData();
    }, [loadBoardData]);

    /**
     * Updates an individual task in the local state.
     */
    const updateLocalTask = (updatedTask: Task) => {
        const newColumns = { ...columns };
        Object.keys(newColumns).forEach(colId => {
            const tasks = [...newColumns[colId].tasks];
            const idx = tasks.findIndex(t => t.id === updatedTask.id);
            if (idx !== -1) {
                tasks[idx] = updatedTask;
                newColumns[colId] = { ...newColumns[colId], tasks };
            }
        });
        setColumns(newColumns);
        if (selectedTask?.id === updatedTask.id) {
            setSelectedTask(updatedTask);
        }
    };

    /**
     * Handlers for board operations
     */
    const createTask = async (columnId: string, title: string, priority: Priority, description: string) => {
        if (!boardId) return;
        try {
            const newTaskData = await projectService.createTask({
                boardId,
                columnId,
                title,
                priority,
                description,
                position: columns[columnId].tasks.length,
                dueDate: new Date().toISOString().split('T')[0]
            });

            const newTask: Task = {
                id: newTaskData.id,
                title: newTaskData.title,
                priority: newTaskData.priority as Priority,
                description: newTaskData.description,
                dueDate: newTaskData.due_date,
                labels: [],
                assignedUsers: [],
                attachments: [],
                checklist: [],
                column_id: columnId
            };

            const newCols = { ...columns };
            newCols[columnId].tasks.push(newTask);
            setColumns(newCols);
            addNotification({ type: 'success', title: 'Tarea Creada', message: `"${title}" ha sido agregada.` });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const toggleLabel = async (task: Task, label: Label) => {
        const exists = task.labels.find(l => l.name === label.name);
        try {
            if (exists) {
                await projectService.removeLabel(task.id, label.name);
                const updatedTask = { ...task, labels: task.labels.filter(l => l.name !== label.name) };
                updateLocalTask(updatedTask);
            } else {
                const newLabel = await projectService.addLabel(task.id, label.name, label.color);
                const updatedTask = { ...task, labels: [...task.labels, newLabel] };
                updateLocalTask(updatedTask);
            }
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const toggleMember = async (task: Task, member: { user_id: string, user_initials: string }) => {
        const isAssigned = task.assignedUsers.find(u => u.user_id === member.user_id);
        try {
            if (isAssigned) {
                await projectService.removeAssignee(task.id, member.user_id);
                const updatedTask = { ...task, assignedUsers: task.assignedUsers.filter(u => u.user_id !== member.user_id) };
                updateLocalTask(updatedTask);
            } else {
                const newAssignee = await projectService.addAssignee(task.id, member.user_id, member.user_initials);
                const updatedTask = { ...task, assignedUsers: [...task.assignedUsers, newAssignee] };
                updateLocalTask(updatedTask);
            }
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error de Asignación', message: error.message });
        }
    };

    const moveTask = async (taskId: string, sourceColId: string, destColId: string) => {
        if (sourceColId === destColId) return;

        const sourceCol = columns[sourceColId];
        const destCol = columns[destColId];
        const taskIdx = sourceCol.tasks.findIndex(t => t.id === taskId);
        const task = sourceCol.tasks[taskIdx];

        // Optimistic update
        const newCols = { ...columns };
        newCols[sourceColId].tasks.splice(taskIdx, 1);
        newCols[destColId].tasks.push(task);
        setColumns(newCols);

        try {
            await projectService.moveTask(taskId, destColId, newCols[destColId].tasks.length - 1);
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error al mover', message: error.message });
            loadBoardData(); // Rollback
        }
    };

    const updateTaskFields = async (taskId: string, updates: Partial<Task>) => {
        try {
            // Map UI fields to Database fields if necessary
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
            if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
            if (updates.is_template !== undefined) dbUpdates.is_template = updates.is_template;
            if (updates.cover_color !== undefined) dbUpdates.cover_color = updates.cover_color;

            const updatedData = await projectService.updateTask(taskId, dbUpdates);

            if (selectedTask && selectedTask.id === taskId) {
                const updatedTask = { ...selectedTask, ...updates };
                updateLocalTask(updatedTask);
            }
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const copyTask = async (task: Task) => {
        if (!boardId) return;
        try {
            const newTaskData = await projectService.createTask({
                boardId,
                columnId: task.column_id,
                title: `${task.title} (Copia)`,
                priority: task.priority,
                description: task.description,
                position: columns[task.column_id!].tasks.length,
                dueDate: task.dueDate || null
            });

            const newTask: Task = {
                id: newTaskData.id,
                title: newTaskData.title,
                priority: newTaskData.priority as Priority,
                description: newTaskData.description,
                dueDate: newTaskData.due_date,
                is_template: newTaskData.is_template,
                cover_color: newTaskData.cover_color,
                labels: [],
                assignedUsers: [],
                attachments: [],
                checklist: [],
                column_id: task.column_id
            };

            const newCols = { ...columns };
            newCols[task.column_id!].tasks.push(newTask);
            setColumns(newCols);
            addNotification({ type: 'success', title: 'Copia Creada', message: 'Se ha duplicado la tarjeta correctamente.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error al Copiar', message: error.message });
        }
    };

    const uploadAttachment = async (taskId: string, file: File | Blob, fileName: string) => {
        try {
            addNotification({ type: 'info', title: 'Subiendo...', message: 'El archivo se está guardando.' });
            const publicUrl = await projectService.uploadAttachment(file, fileName);
            const attData = await projectService.createAttachmentRecord({
                taskId,
                name: fileName,
                url: publicUrl,
                type: file.type,
                size: file.size
            });

            if (selectedTask) {
                const updatedTask = { ...selectedTask, attachments: [...(selectedTask.attachments || []), attData] };
                updateLocalTask(updatedTask);
            }
            addNotification({ type: 'success', title: 'Éxito', message: 'Archivo adjuntado.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error de carga', message: error.message });
        }
    };

    const addChecklistItem = async (taskId: string, text: string) => {
        try {
            const newItem = await projectService.addChecklistItem(taskId, text);
            if (selectedTask && selectedTask.id === taskId) {
                const updatedTask = { ...selectedTask, checklist: [...(selectedTask.checklist || []), newItem] };
                updateLocalTask(updatedTask);
            }
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const toggleChecklistItem = async (taskId: string, itemId: string, currentStatus: boolean) => {
        try {
            const updatedItem = await projectService.updateChecklistItem(itemId, { completed: !currentStatus });
            if (selectedTask && selectedTask.id === taskId) {
                const updatedChecklist = selectedTask.checklist?.map(i => i.id === itemId ? updatedItem : i);
                const updatedTask = { ...selectedTask, checklist: updatedChecklist };
                updateLocalTask(updatedTask);
            }
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const removeChecklistItem = async (taskId: string, itemId: string) => {
        try {
            await projectService.removeChecklistItem(itemId);
            if (selectedTask && selectedTask.id === taskId) {
                const updatedChecklist = selectedTask.checklist?.filter(i => i.id !== itemId);
                const updatedTask = { ...selectedTask, checklist: updatedChecklist };
                updateLocalTask(updatedTask);
            }
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            await projectService.deleteTask(taskId);

            // Remove from local state
            const newColumns = { ...columns };
            if (selectedTask && selectedTask.id === taskId) {
                const colId = selectedTask.column_id;
                if (colId && newColumns[colId]) {
                    newColumns[colId] = { ...newColumns[colId], tasks: newColumns[colId].tasks.filter(t => t.id !== taskId) };
                    setColumns(newColumns);
                }
                setSelectedTask(null);
            }
            addNotification({ type: 'success', title: 'Tarea Eliminada', message: 'La tarea ha sido borrada permanentemente.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const archiveTask = async (taskId: string) => {
        try {
            await projectService.archiveTask(taskId);
            // Treat same as delete locally for visual UX (disappears from board)
            const newColumns = { ...columns };
            if (selectedTask && selectedTask.id === taskId) {
                const colId = selectedTask.column_id;
                if (colId && newColumns[colId]) {
                    newColumns[colId] = { ...newColumns[colId], tasks: newColumns[colId].tasks.filter(t => t.id !== taskId) };
                    setColumns(newColumns);
                }
                setSelectedTask(null);
            }
            addNotification({ type: 'info', title: 'Tarea Archivada', message: 'La tarea se movió al archivo histórico.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Error', message: error.message });
        }
    };

    return {
        columns,
        loading,
        selectedTask,
        setSelectedTask,
        createTask,
        toggleLabel,
        toggleMember,
        moveTask,
        copyTask,
        updateTaskFields,
        uploadAttachment,
        addChecklistItem,
        toggleChecklistItem,
        removeChecklistItem,
        deleteTask,
        archiveTask,
        refresh: loadBoardData
    };
};
