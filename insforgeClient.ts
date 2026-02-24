/// <reference types="vite/client" />
import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_URL;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!baseUrl || !anonKey) {
    console.warn('InsForge credentials missing. Check .env.local');
}

export const insforge = createClient({
    baseUrl: baseUrl || '',
    anonKey: anonKey || ''
});

// Proxy handler to maintain compatibility with existing @supabase/supabase-js code
export const supabase = {
    auth: {
        signUp: async (credentials: any) => {
            const { email, password, options } = credentials;
            return insforge.auth.signUp({
                email,
                password,
                name: options?.data?.full_name || options?.data?.name || options?.name,
                options: {
                    emailRedirectTo: options?.emailRedirectTo
                }
            });
        },
        signInWithPassword: (credentials: any) => insforge.auth.signInWithPassword(credentials),
        signOut: () => insforge.auth.signOut(),
        getUser: () => insforge.auth.getCurrentUser(),
        getSession: () => insforge.auth.getCurrentSession(),
        onAuthStateChange: (callback: (event: string, session: any) => void) => {
            // InsForge auth doesn't have a direct onAuthStateChange yet, 
            // but we can simulate the initial call
            insforge.auth.getCurrentUser().then(({ data }) => {
                if (data?.user) callback('SIGNED_IN', { user: data.user });
            });
            return { data: { subscription: { unsubscribe: () => { } } } };
        }
    },
    from: (table: string) => insforge.database.from(table),
    rpc: (fn: string, args?: any) => insforge.database.rpc(fn, args),
    storage: insforge.storage,
};

export default insforge;
