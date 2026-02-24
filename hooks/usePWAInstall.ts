import { useState, useEffect } from 'react';

// Extend Window interface to support beforeinstallprompt event
export interface BeforeInstallPromptEvent extends Event {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        globalDeferredPrompt = e as BeforeInstallPromptEvent;
        promptListeners.forEach(listener => listener(globalDeferredPrompt));
    });
}

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);

    useEffect(() => {
        const handler = (prompt: BeforeInstallPromptEvent | null) => {
            setDeferredPrompt(prompt);
        };

        promptListeners.add(handler);
        // Explicitly set in case it fired just before this effect ran
        setDeferredPrompt(globalDeferredPrompt);

        return () => {
            promptListeners.delete(handler);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            globalDeferredPrompt = null;
            promptListeners.forEach(listener => listener(null));
        }
    };

    return {
        isInstallable: !!deferredPrompt,
        promptInstall
    };
};
