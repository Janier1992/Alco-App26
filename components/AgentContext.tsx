import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ActiveDocument {
    name: string;
    content: string; // Base64
    mime: string;
}

interface AgentContextType {
    isAgentOpen: boolean;
    toggleAgent: (isOpen?: boolean) => void;
    activeDocument: ActiveDocument | null;
    setActiveDocument: (doc: ActiveDocument | null) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAgentOpen, setIsAgentOpen] = useState(false);
    const [activeDocument, setActiveDocument] = useState<ActiveDocument | null>(null);

    const toggleAgent = (isOpen?: boolean) => {
        setIsAgentOpen(prev => isOpen ?? !prev);
    };

    return (
        <AgentContext.Provider value={{ isAgentOpen, toggleAgent, activeDocument, setActiveDocument }}>
            {children}
        </AgentContext.Provider>
    );
};

export const useAgent = () => {
    const context = useContext(AgentContext);
    if (!context) {
        throw new Error('useAgent must be used within an AgentProvider');
    }
    return context;
};
