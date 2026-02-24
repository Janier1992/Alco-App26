import { supabase } from '../insforgeClient';

export interface EmailLog {
    id: string;
    recipient: string;
    subject: string;
    body: string;
    moduleName?: string;
    referenceId?: string;
    triggeredBy?: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: string;
}

export const EmailService = {
    /**
     * Enviar correo electrónico
     * @param params Parámetros del correo a enviar
     */
    async send(params: {
        to: string;
        subject: string;
        body: string;
        moduleName?: string;
        referenceId?: string;
        triggeredBy?: string;
    }): Promise<void> {
        try {
            // Log the email attempt (Can be linked to edge function logic later)
            const { error: logError } = await supabase
                .from('email_logs')
                .insert([{
                    recipient: params.to,
                    subject: params.subject,
                    body: params.body,
                    module_name: params.moduleName,
                    reference_id: params.referenceId,
                    triggered_by: params.triggeredBy,
                    status: 'pending', // Will be 'sent' when an external API/edge function processes it
                }]);

            if (logError) throw logError;
            console.info(`[EmailService] Logged email intent to ${params.to}: ${params.subject}`);

            // TODO: Here is where the actual HTTP Request to EmailJS, Resend API, or Zapier Webhook should go.
            // Example:
            // await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', body: ... })

        } catch (error) {
            console.error('[EmailService] send error:', error);
        }
    },

    /**
     * Recupera el listado de correos enviados/pendientes
     */
    async fetchLogs(limit = 50): Promise<EmailLog[]> {
        try {
            const { data, error } = await supabase
                .from('email_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;

            return (data || []).map((row: any) => ({
                id: row.id,
                recipient: row.recipient,
                subject: row.subject,
                body: row.body,
                moduleName: row.module_name,
                referenceId: row.reference_id,
                triggeredBy: row.triggered_by,
                status: row.status,
                createdAt: row.created_at,
            }));
        } catch (error) {
            console.error('[EmailService] fetchLogs error:', error);
            return [];
        }
    }
};
