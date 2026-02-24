import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useMessaging } from '../components/MessagingContext';

export const useMessagingSystem = () => {
    const { conversations, createConversation, currentUserId } = useMessaging();

    /**
     * Publishes a system message associated with a specific module.
     * It checks if a conversation linked to that module already exists.
     * If it exists, it sends the system message to that conversation.
     * If it doesn't exist, it creates a new conversation and sends the system message.
     */
    const publishSystemMessage = useCallback(async (
        moduleName: 'nc' | 'audit' | 'document' | 'project',
        referenceId: string,
        content: string,
        title: string,
        participants: string[]
    ) => {
        try {
            // 1. Try to find an existing conversation linked to this module/reference
            let targetConvId = null;
            const existingConv = conversations.find(c =>
                c.linkedModule === moduleName &&
                c.linkedId === referenceId
            );

            if (existingConv) {
                targetConvId = existingConv.id;
            } else {
                // 2. If it doesn't exist, create it (we use the group type for module chats, or 'module-linked' if preferred but 'group' works)
                // We're mimicking the logic from MessagingContext but passing linked params
                const { data: convData, error: convErr } = await supabase
                    .from('conversations')
                    .insert([{
                        type: 'module-linked',
                        title: title,
                        created_by: currentUserId,
                        organization_id: '1' // Assuming default from context
                    }])
                    .select()
                    .single();

                if (convErr) throw convErr;
                targetConvId = convData.id;

                // Insert participants including the current user + requested ones
                const uniqueParticipants = Array.from(new Set([currentUserId, ...participants]));
                const partPayloads = uniqueParticipants.map(uid => ({
                    conversation_id: targetConvId,
                    user_id: uid,
                    conv_role: uid === currentUserId ? 'admin' : 'member'
                }));

                await supabase.from('conversation_participants').insert(partPayloads);

                // Note: We might want to call refreshConversations here but Context handles it mostly via realtime or if we trigger it
            }

            if (!targetConvId) return;

            // 3. Send the system message
            const dbPayload: any = {
                conversation_id: targetConvId,
                sender_id: currentUserId, // Or maybe a system uuid? using current user who triggered for traceability
                content: content,
                message_type: 'system',
                read_status: 'sent',
            };

            const { error: msgErr } = await supabase.from('messages').insert([dbPayload]);
            if (msgErr) throw msgErr;

        } catch (error) {
            console.error('Error in publishSystemMessage:', error);
        }
    }, [conversations, currentUserId, createConversation]);

    return { publishSystemMessage };
};
