/**
 * @file projectService.ts
 * @description Service layer for Project Management. Handles all direct interactions with the database and storage.
 * @module services/projects
 * @author Antigravity Architect
 */

import { supabase } from '../../insforgeClient';
import type { Priority, Label, UserAvatar, Attachment, Task, Column } from '../../types';

export interface ProjectService {
    /**
     * Fetches the board metadata by its type.
     * @param type - The board type (e.g., 'projects')
     */
    getBoardByType(type: string): Promise<any>;

    /**
     * Fetches all columns associated with a specific board.
     * @param boardId - The UUID of the board.
     */
    getColumnsByBoardId(boardId: string): Promise<any[]>;

    /**
     * Creates default columns for a board if none exist.
     * @param boardId - The UUID of the board.
     * @param titles - Array of column titles to create.
     */
    createDefaultColumns(boardId: string, titles: string[]): Promise<any[]>;

    /**
     * Fetches all tasks for a set of columns with all related details (labels, assignees, etc.)
     * @param columnIds - Array of column UUIDs.
     */
    getTasksWithDetails(columnIds: string[]): Promise<any[]>;

    /**
     * Logic for creating a new task.
     */
    createTask(params: {
        boardId: string;
        columnId: string;
        title: string;
        priority: Priority;
        description: string;
        position: number;
        dueDate: string;
    }): Promise<any>;

    /**
     * Updates specific fields of a task.
     */
    updateTask(taskId: string, updates: Partial<any>): Promise<any>;

    /**
     * Manages task labels.
     */
    addLabel(taskId: string, name: string, color: string): Promise<any>;
    removeLabel(taskId: string, labelName: string): Promise<any>;

    /**
     * Manages task assignees.
     */
    addAssignee(taskId: string, userId: string, initials: string): Promise<any>;
    removeAssignee(taskId: string, userId: string): Promise<any>;

    /**
     * Handles file uploads to storage and database record creation.
     */
    uploadAttachment(file: File | Blob, fileName: string): Promise<string>;
    createAttachmentRecord(params: {
        taskId: string;
        name: string;
        url: string;
        type: string;
        size: number;
    }): Promise<any>;

    /**
     * Moves a task between columns.
     */
    moveTask(taskId: string, newColumnId: string, position: number): Promise<any>;
}

export const projectService: ProjectService = {
    async getBoardByType(type: string) {
        const { data, error } = await supabase
            .from('boards')
            .select('id')
            .eq('type', type)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data?.[0];
    },

    async getColumnsByBoardId(boardId: string) {
        const { data, error } = await supabase
            .from('board_columns')
            .select('*')
            .eq('board_id', boardId)
            .order('position');

        if (error) throw error;
        return data || [];
    },

    async createDefaultColumns(boardId: string, titles: string[]) {
        const createdCols = [];
        for (let i = 0; i < titles.length; i++) {
            const { data, error } = await supabase.from('board_columns').insert({
                board_id: boardId,
                title: titles[i],
                position: i
            }).select().single();
            if (error) throw error;
            if (data) createdCols.push(data);
        }
        return createdCols;
    },

    async getTasksWithDetails(columnIds: string[]) {
        const { data, error } = await supabase
            .from('board_tasks')
            .select(`
                *,
                labels:task_labels(*),
                assignedUsers:task_assignees(*),
                checklist:task_checklists(*),
                attachments:task_attachments(*),
                comments:task_comments(*)
            `)
            .in('column_id', columnIds)
            .order('position');

        if (error) throw error;
        return data || [];
    },

    async createTask(params) {
        const { data, error } = await supabase.from('board_tasks').insert({
            board_id: params.boardId,
            column_id: params.columnId,
            title: params.title,
            priority: params.priority,
            description: params.description,
            position: params.position,
            due_date: params.dueDate
        }).select().single();

        if (error) throw error;
        return data;
    },

    async updateTask(taskId, updates) {
        const { data, error } = await supabase
            .from('board_tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async addLabel(taskId, name, color) {
        const { data, error } = await supabase.from('task_labels').insert({
            task_id: taskId,
            name,
            color
        }).select().single();

        if (error) throw error;
        return data;
    },

    async removeLabel(taskId, labelName) {
        const { error } = await supabase
            .from('task_labels')
            .delete()
            .eq('task_id', taskId)
            .eq('name', labelName);

        if (error) throw error;
    },

    async addAssignee(taskId, userId, initials) {
        const { data, error } = await supabase.from('task_assignees').insert({
            task_id: taskId,
            user_id: userId,
            user_initials: initials
        }).select().single();

        if (error) throw error;
        return data;
    },

    async removeAssignee(taskId, userId) {
        const { error } = await supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', taskId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    async uploadAttachment(file, fileName) {
        const { error: uploadError } = await (supabase.storage.from('project-attachments') as any).upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = (supabase.storage.from('project-attachments') as any).getPublicUrl(fileName);
        return publicUrlData.publicUrl;
    },

    async createAttachmentRecord(params) {
        const { data, error } = await supabase.from('task_attachments').insert({
            task_id: params.taskId,
            name: params.name,
            url: params.url,
            type: params.type,
            size: params.size
        }).select().single();

        if (error) throw error;
        return data;
    },

    async moveTask(taskId, newColumnId, position) {
        const { error } = await supabase
            .from('board_tasks')
            .update({
                column_id: newColumnId,
                position: position
            })
            .eq('id', taskId);

        if (error) throw error;
    }
};
