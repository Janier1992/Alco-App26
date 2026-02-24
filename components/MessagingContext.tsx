
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import type { Conversation, ChatMessage, ChatParticipant, User } from '../types';
import { supabase } from '../insforgeClient';

interface MessagingContextType {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: ChatMessage[];
    soundEnabled: boolean;
    totalUnread: number;
    searchTerm: string;
    filterType: 'all' | 'direct' | 'group' | 'module-linked';
    isLoading: boolean;
    isLoadingMessages: boolean;
    setActiveConversation: (id: string | null) => void;
    sendMessage: (content: string, type?: 'text' | 'file' | 'image', replyTo?: ChatMessage) => void;
    markAsRead: (conversationId: string) => void;
    toggleSound: () => void;
    setSearchTerm: (term: string) => void;
    setFilterType: (type: 'all' | 'direct' | 'group' | 'module-linked') => void;
    createConversation: (title: string, type: 'direct' | 'group', participantIds: string[]) => void;
    currentUserId: string;
    refreshConversations: () => void;
    directoryUsers: User[];
    uploadAttachment: (file: File, type: 'image' | 'file') => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessaging = (): MessagingContextType => {
    const ctx = useContext(MessagingContext);
    if (!ctx) throw new Error('useMessaging must be used within MessagingProvider');
    return ctx;
};

// Notification sound using Web Audio API
const playNotificationSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.setTargetAtTime(660, audioCtx.currentTime + 0.05, 0.02);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) { /* silent */ }
};

interface MessagingProviderProps {
    children: ReactNode;
    userId: string;
    userName: string;
}

// ─── Map DB rows to app types ─────────────────────────────────
const mapConversation = (row: any, participants: ChatParticipant[], lastMessage?: ChatMessage, unreadCount = 0): Conversation => ({
    id: row.id,
    type: row.type,
    organizationId: row.organization_id || 'default_org',
    createdBy: row.created_by,
    title: row.title,
    avatar: row.avatar,
    participants,
    lastMessage,
    unreadCount,
    linkedModule: row.linked_module,
    linkedId: row.linked_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
});

const mapMessage = (row: any, _readByList: string[] = []): ChatMessage => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.message_type,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    readStatus: row.read_status,
    replyTo: row.reply_to_id ? {
        id: row.reply_to_id,
        senderName: '', // Resolvido en UI
        content: '',
    } : undefined,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
});

const mapParticipant = (row: any, usersData: Record<string, any>, sessionsData: Record<string, any>): ChatParticipant => {
    // Para simplificar, obtenemos info de la tabla users y user_sessions
    const user = usersData[row.user_id] || {};
    const session = sessionsData[row.user_id] || {};
    return {
        userId: row.user_id,
        username: user.username || user.name || `User ${row.user_id.substring(0, 4)}`,
        role: row.role || 'member',
        isOnline: session.is_online || false,
        isTyping: false,
        avatar: user.avatar,
        lastReadAt: row.last_read_at,
    };
};

export const MessagingProvider: React.FC<MessagingProviderProps> = ({ children, userId, userName }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
    const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'direct' | 'group' | 'module-linked'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const prevMessageCountRef = useRef(0);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activeConvIdRef = useRef<string | null>(null);

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    // ─── Fetch Directory Users ─────────────────────────────────
    const fetchDirectoryUsers = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            const mappedUsers = (data || []).map(p => ({
                id: p.id,
                email: '',
                username: p.full_name || 'Usuario',
                role: p.role || 'user',
            }));
            setDirectoryUsers(mappedUsers);
        } catch (error) {
            console.error('Error fetching directory users:', error);
        }
    }, []);

    useEffect(() => {
        fetchDirectoryUsers();
    }, [fetchDirectoryUsers]);

    // ─── Fetch all conversations for current user ─────────────
    const fetchConversations = useCallback(async () => {
        if (!userId) return;
        try {
            // Update session heartbeat
            supabase.from('user_sessions').upsert({
                user_id: userId,
                is_online: true,
                last_activity: new Date().toISOString()
            }).then();

            // 1. Get all conversation IDs where user is a participant
            const { data: participantRows, error: pErr } = await supabase
                .from('conversation_participants')
                .select('*')
                .eq('user_id', userId);
            if (pErr) throw pErr;
            if (!participantRows || participantRows.length === 0) {
                setConversations([]);
                setIsLoading(false);
                return;
            }

            const convIds = (participantRows as any[]).map((p: any) => p.conversation_id);

            // 2. Fetch conversations
            const { data: convRows, error: cErr } = await supabase
                .from('conversations')
                .select('*')
                .in('id', convIds);
            if (cErr) throw cErr;

            // 3. Fetch ALL participants for these conversations
            const { data: allParticipantRows, error: apErr } = await supabase
                .from('conversation_participants')
                .select('*')
                .in('conversation_id', convIds);
            if (apErr) throw apErr;

            // Get unique participant user IDs
            const allUserIds = Array.from(new Set(allParticipantRows?.map((p: any) => p.user_id) || []));

            // Fetch details for these users from `profiles`
            const { data: profileRows } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('id', allUserIds);

            const usersMap: Record<string, any> = { [userId]: { username: userName } };
            (profileRows || []).forEach(p => {
                usersMap[p.id] = { username: p.full_name, role: p.role };
            });

            // Fetch sessions for these users
            const { data: sessionRows } = await supabase
                .from('user_sessions')
                .select('*')
                .in('user_id', allUserIds);

            const sessionsMap: Record<string, any> = {};
            (sessionRows || []).forEach(s => {
                // Consider offline if last_activity is older than 2 minutes
                const isOnline = new Date().getTime() - new Date(s.last_activity).getTime() < 120000;
                sessionsMap[s.user_id] = { ...s, is_online: isOnline };
            });

            // 4. Fetch last message for each conversation
            const { data: recentMessages, error: mErr } = await supabase
                .from('messages')
                .select('*')
                .in('conversation_id', convIds)
                .order('created_at', { ascending: false });
            if (mErr) throw mErr;

            // Group participants by conversation
            const participantsByConv: Record<string, ChatParticipant[]> = {};

            (allParticipantRows || []).forEach((p: any) => {
                if (!participantsByConv[p.conversation_id]) participantsByConv[p.conversation_id] = [];
                participantsByConv[p.conversation_id].push(mapParticipant(p, usersMap, sessionsMap));
            });

            // Get last message per conversation
            const lastMsgByConv: Record<string, ChatMessage> = {};
            (recentMessages || []).forEach((m: any) => {
                if (!lastMsgByConv[m.conversation_id]) {
                    lastMsgByConv[m.conversation_id] = mapMessage(m);
                }
            });

            // Get unread count per conversation
            const userParticipantMap: Record<string, any> = {};
            (participantRows as any[]).forEach((p: any) => {
                userParticipantMap[p.conversation_id] = p;
            });

            // Build conversation objects
            const convs: Conversation[] = (convRows || []).map((c: any) => {
                const participants = participantsByConv[c.id] || [];
                const lastMessage = lastMsgByConv[c.id];
                const userPart = userParticipantMap[c.id];

                let unreadCount = 0;
                if (userPart && lastMessage) {
                    const lastRead = new Date(userPart.last_read_at || '1970-01-01').getTime();
                    (recentMessages || []).forEach((m: any) => {
                        if (m.conversation_id === c.id && m.sender_id !== userId && !m.deleted_at) {
                            const msgTime = new Date(m.created_at).getTime();
                            if (msgTime > lastRead) unreadCount++;
                        }
                    });
                }

                return mapConversation(c, participants, lastMessage, unreadCount);
            });

            // Sort by last updated/created time
            convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            setConversations(convs);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, userName]);

    // ─── Fetch messages for active conversation ───────────────
    const fetchMessages = useCallback(async (conversationId: string) => {
        setIsLoadingMessages(true);
        try {
            const { data: msgRows, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            if (error) throw error;

            // Fetch read receipts
            const msgIds = (msgRows || []).map((m: any) => m.id);
            let readMap: Record<string, string[]> = {};
            if (msgIds.length > 0) {
                const { data: readRows } = await supabase
                    .from('message_reads')
                    .select('*')
                    .in('message_id', msgIds);
                (readRows || []).forEach((r: any) => {
                    if (!readMap[r.message_id]) readMap[r.message_id] = [];
                    readMap[r.message_id].push(r.user_id);
                });
            }

            // Resolve sender names manually if needed since they are removed from messages table
            const mappedMessages = (msgRows || []).map((m: any) => {
                const msg = mapMessage(m, readMap[m.id] || []);
                const sender = conversations.flatMap(c => c.participants).find(p => p.userId === m.sender_id);
                msg.senderName = sender?.username || (m.sender_id === userId ? userName : m.sender_id);
                msg.senderAvatar = sender?.avatar;

                if (msg.replyTo) {
                    const replyToMsg = msgRows.find((rm: any) => rm.id === msg.replyTo!.id);
                    if (replyToMsg) {
                        const replySender = conversations.flatMap(c => c.participants).find(p => p.userId === replyToMsg.sender_id);
                        msg.replyTo.senderName = replySender?.username || replyToMsg.sender_id;
                        msg.replyTo.content = replyToMsg.content;
                    }
                }
                return msg;
            });

            // Check if new messages arrived (for sound notification)
            if (mappedMessages.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
                const lastMsg = mappedMessages[mappedMessages.length - 1];
                if (lastMsg && lastMsg.senderId !== userId && soundEnabled && lastMsg.type !== 'system') {
                    playNotificationSound();
                }
            }
            prevMessageCountRef.current = mappedMessages.length;

            setMessages(mappedMessages);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    }, [userId, soundEnabled]);

    // ─── Set active conversation ──────────────────────────────
    const setActiveConversation = useCallback(async (id: string | null) => {
        setActiveConversationIdState(id);
        activeConvIdRef.current = id;
        prevMessageCountRef.current = 0;

        if (id) {
            await fetchMessages(id);
            // Mark as read: update last_read_at
            try {
                await supabase
                    .from('conversation_participants')
                    .update({ last_read_at: new Date().toISOString() })
                    .eq('conversation_id', id)
                    .eq('user_id', userId);
            } catch (e) {
                console.error('Error marking as read:', e);
            }
            // Update local unread count
            setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
        } else {
            setMessages([]);
        }
    }, [fetchMessages, userId]);

    // ─── Send message ─────────────────────────────────────────
    const sendMessage = useCallback(async (content: string, type: 'text' | 'file' | 'image' | 'system' = 'text', replyTo?: ChatMessage) => {
        if (!activeConvIdRef.current || !content.trim()) return;
        const convId = activeConvIdRef.current;

        const dbPayload: any = {
            conversation_id: convId,
            sender_id: userId,
            content: content.trim(),
            message_type: type,
            read_status: 'sent',
        };

        if (replyTo) {
            dbPayload.reply_to_id = replyTo.id;
        }

        if (type === 'file' || type === 'image') {
            dbPayload.file_name = content.trim();
        }

        try {
            const { error } = await supabase.from('messages').insert([dbPayload]);
            if (error) throw error;

            // Insert read receipt for sender
            // (we'll get the message id from refetch)

            // Refresh messages to show the new one
            await fetchMessages(convId);
            // Refresh conversations to update lastMessage
            await fetchConversations();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, [userId, userName, fetchMessages, fetchConversations]);

    // ─── Upload Attachment ────────────────────────────────────
    const uploadAttachment = useCallback(async (file: File, type: 'image' | 'file') => {
        if (!activeConvIdRef.current) return;
        const convId = activeConvIdRef.current;
        setIsLoadingMessages(true);

        try {
            const timestamp = new Date().getTime();
            const filePath = `${convId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('chat_attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const fileUrl = supabase.storage
                .from('chat_attachments')
                .getPublicUrl(filePath);

            // Save message
            const dbPayload: any = {
                conversation_id: convId,
                sender_id: userId,
                content: file.name, // The file name goes into content
                message_type: type,
                read_status: 'sent',
                file_name: file.name,
                file_url: fileUrl,
                file_size: file.size
            };

            const { error: msgErr } = await supabase.from('messages').insert([dbPayload]);
            if (msgErr) throw msgErr;

            await fetchMessages(convId);
            await fetchConversations();
        } catch (error) {
            console.error('Error uploading attachment:', error);
            alert('Error al adjuntar archivo. Verifica los permisos de almacenamiento.');
        } finally {
            setIsLoadingMessages(false);
        }
    }, [userId, fetchMessages, fetchConversations]);

    // ─── Mark as read ─────────────────────────────────────────
    const markAsRead = useCallback(async (conversationId: string) => {
        try {
            await supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);
            setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
        } catch (e) {
            console.error('Error marking as read:', e);
        }
    }, [userId]);

    // ─── Toggle sound ─────────────────────────────────────────
    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => !prev);
    }, []);

    // ─── Create conversation ──────────────────────────────────
    const createConversation = useCallback(async (title: string, type: 'direct' | 'group', participantIds: string[]) => {
        try {
            // Lazy load direct check: if direct, check if we already have one
            if (type === 'direct' && participantIds.length === 1) {
                const existing = conversations.find(c =>
                    c.type === 'direct' &&
                    c.participants.length === 2 &&
                    c.participants.some(p => p.userId === participantIds[0])
                );
                if (existing) {
                    setActiveConversation(existing.id);
                    return;
                }
            }

            // 1. Create conversation
            const { data: convData, error: convErr } = await supabase
                .from('conversations')
                .insert([{ type, title, created_by: userId, organization_id: 'default_org' }]);
            if (convErr) throw convErr;

            // Get the new conversation ID
            // Since insforge may not return the inserted row, fetch the latest
            const { data: latestConv } = await supabase
                .from('conversations')
                .select('*')
                .eq('title', title)
                .eq('type', type)
                .order('created_at', { ascending: false });

            const newConvId = (latestConv && latestConv.length > 0) ? (latestConv as any[])[0].id : null;
            if (!newConvId) {
                console.error('Could not retrieve new conversation ID');
                return;
            }

            // 2. Add current user as participant and others
            const participants = [
                {
                    conversation_id: newConvId,
                    user_id: userId,
                    role: 'admin',
                    last_read_at: new Date().toISOString()
                },
                ...participantIds.map(pid => {
                    return {
                        conversation_id: newConvId,
                        user_id: pid,
                        role: 'member',
                    };
                }),
            ];

            const { error: pErr } = await supabase
                .from('conversation_participants')
                .insert(participants);
            if (pErr) throw pErr;

            // 3. Emit system message
            await supabase.from('messages').insert([{
                conversation_id: newConvId,
                sender_id: 'system',
                content: `${userName} creó la conversación`,
                message_type: 'system'
            }]);

            // 4. Refresh and switch to new conversation
            await fetchConversations();
            setActiveConversation(newConvId);
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    }, [userId, userName, conversations, fetchConversations, setActiveConversation]);

    // ─── Initial load ─────────────────────────────────────────
    useEffect(() => {
        if (userId) {
            fetchConversations();
        }
    }, [userId, fetchConversations]);

    // ─── Polling for real-time updates ────────────────────────
    // Poll every 5 seconds for new messages and conversation updates
    useEffect(() => {
        if (!userId) return;

        pollIntervalRef.current = setInterval(() => {
            // Refresh active conversation messages
            if (activeConvIdRef.current) {
                fetchMessages(activeConvIdRef.current);
            }
            // Refresh conversation list (for unread counts, last messages)
            fetchConversations();
        }, 5000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [userId, fetchMessages, fetchConversations]);

    return (
        <MessagingContext.Provider value={{
            conversations, activeConversationId, messages, soundEnabled, totalUnread,
            searchTerm, filterType, isLoading, isLoadingMessages,
            setActiveConversation, sendMessage, markAsRead, toggleSound,
            setSearchTerm, setFilterType, createConversation,
            currentUserId: userId,
            refreshConversations: fetchConversations,
            directoryUsers,
            uploadAttachment,
        }}>
            {children}
        </MessagingContext.Provider>
    );
};

export default MessagingContext;
