import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useMessaging } from './MessagingContext';
import type { Conversation, ChatMessage, User } from '../types';

// ─── Helper Functions ─────────────────────────────────────────
const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatLastMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';
    msgs.forEach(msg => {
        const dateLabel = formatDate(msg.createdAt);
        if (dateLabel !== currentDate) {
            currentDate = dateLabel;
            groups.push({ date: dateLabel, messages: [] });
        }
        groups[groups.length - 1].messages.push(msg);
    });
    return groups;
};

// ─── Read Status Icons ────────────────────────────────────────
const ReadStatusIcon: React.FC<{ status: string; small?: boolean }> = ({ status, small }) => {
    const sz = small ? 'text-[8px]' : 'text-[10px]';
    if (status === 'read') return <span className={`${sz} text-indigo-400`}><i className="fas fa-check-double"></i></span>;
    if (status === 'delivered') return <span className={`${sz} text-slate-400`}><i className="fas fa-check-double"></i></span>;
    return <span className={`${sz} text-slate-400`}><i className="fas fa-check"></i></span>;
};

// ─── Avatar Component ─────────────────────────────────────────
const Avatar: React.FC<{ name: string; initials?: string; isOnline?: boolean; size?: 'sm' | 'md' | 'lg'; color?: string }> = ({ name, initials, isOnline, size = 'md', color }) => {
    const colors = ['from-indigo-600 to-violet-500', 'from-emerald-500 to-teal-400', 'from-amber-500 to-orange-400', 'from-rose-500 to-pink-400', 'from-cyan-500 to-blue-400', 'from-fuchsia-500 to-purple-400'];
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const gradient = color || colors[hash % colors.length];
    const sizes = { sm: 'w-8 h-8 text-[10px]', md: 'w-10 h-10 text-xs', lg: 'w-12 h-12 text-sm' };
    const dotSizes = { sm: 'w-2 h-2 border', md: 'w-2.5 h-2.5 border-[1.5px]', lg: 'w-3 h-3 border-2' };
    const display = initials || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="relative flex-shrink-0">
            <div className={`${sizes[size]} bg-gradient-to-tr ${gradient} rounded-xl flex items-center justify-center text-white font-black shadow-sm`}>
                {display}
            </div>
            {isOnline !== undefined && (
                <div className={`absolute -bottom-0.5 -right-0.5 ${dotSizes[size]} rounded-full border-white dark:border-[#0a0e18] ${isOnline ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
            )}
        </div>
    );
};

// ─── Typing Indicator ──────────────────────────────────────────
const TypingIndicator: React.FC<{ names: string[] }> = ({ names }) => {
    if (names.length === 0) return null;
    const text = names.length === 1
        ? `${names[0]} está escribiendo`
        : `${names.join(', ')} están escribiendo`;
    return (
        <div className="flex items-center gap-2 px-4 py-2 animate-fade-in">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] rounded-2xl px-4 py-2.5">
                <div className="flex gap-0.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-typing-dot" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">{text}</span>
        </div>
    );
};

// ─── Conversation List Item ────────────────────────────────────
const ConversationItem: React.FC<{
    conv: Conversation;
    isActive: boolean;
    onClick: () => void;
    currentUserId: string;
}> = ({ conv, isActive, onClick, currentUserId }) => {
    const otherParticipant = conv.type === 'direct' ? conv.participants.find(p => p.userId !== currentUserId) : null;
    const isOtherOnline = otherParticipant?.isOnline ?? false;
    const typeIcons: Record<string, string> = { direct: 'fa-user', group: 'fa-users', 'module-linked': 'fa-link' };
    const typeColors: Record<string, string> = {
        direct: 'text-indigo-400', group: 'text-emerald-400', 'module-linked': 'text-amber-400'
    };

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group
                ${isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20'
                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-transparent'
                }`}
        >
            <Avatar
                name={conv.title}
                initials={conv.type === 'direct' ? otherParticipant?.avatar : conv.title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                isOnline={conv.type === 'direct' ? isOtherOnline : undefined}
                size="md"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm font-bold truncate ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {conv.title}
                        </span>
                        <i className={`fas ${typeIcons[conv.type]} text-[8px] ${typeColors[conv.type]} flex-shrink-0`}></i>
                    </div>
                    {conv.lastMessage && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">
                            {formatLastMessageTime(conv.lastMessage.createdAt)}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.lastMessage ? (
                            <>
                                {conv.lastMessage.senderId === currentUserId && <span className="text-slate-400 dark:text-slate-500">Tú: </span>}
                                {conv.lastMessage.type === 'image' ? (
                                    <><i className="fas fa-image text-[9px] mr-1"></i>Imagen</>
                                ) : conv.lastMessage.type === 'file' ? (
                                    <><i className="fas fa-paperclip text-[9px] mr-1"></i>Archivo</>
                                ) : conv.lastMessage.content}
                            </>
                        ) : (
                            <span className="italic text-slate-400">Sin mensajes aún</span>
                        )}
                    </p>
                    {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-gradient-to-r from-indigo-600 to-violet-500 text-white text-[9px] font-black rounded-full shadow-sm">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

// ─── Message Bubble ────────────────────────────────────────────
const MessageBubble: React.FC<{
    msg: ChatMessage;
    isMine: boolean;
    showAvatar: boolean;
    onReply: (msg: ChatMessage) => void;
    isNew?: boolean;
}> = ({ msg, isMine, showAvatar, onReply, isNew }) => {
    const [showActions, setShowActions] = useState(false);

    if (msg.type === 'system') {
        return (
            <div className={`flex justify-center my-4 ${isNew ? 'animate-fade-in' : ''}`}>
                <div className="bg-slate-100 dark:bg-white/[0.04] px-4 py-1.5 rounded-full border border-slate-200/50 dark:border-white/[0.06] flex items-center gap-2">
                    <i className="fas fa-info-circle text-[10px] text-slate-400"></i>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{msg.content}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex gap-2 px-4 group ${isMine ? 'flex-row-reverse' : ''} ${isNew ? 'animate-message-in' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar */}
            <div className="flex-shrink-0 w-8 mt-0.5">
                {showAvatar && !isMine && (
                    <Avatar name={msg.senderName || 'Usuario'} size="sm" />
                )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[70%] relative ${isMine ? 'items-end' : ''}`}>
                {/* Sender Name */}
                {showAvatar && !isMine && (
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 ml-1">{msg.senderName}</p>
                )}

                {/* Reply Preview */}
                {msg.replyTo && (
                    <div className={`mb-1 ml-1 pl-2 border-l-2 ${isMine ? 'border-indigo-300 dark:border-indigo-500' : 'border-slate-300 dark:border-slate-600'} rounded-r-lg`}>
                        <p className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400">{msg.replyTo.senderName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{msg.replyTo.content}</p>
                    </div>
                )}

                {/* Message Content */}
                <div className={`rounded-2xl px-3.5 py-2 ${isMine
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-white/[0.04]'
                    }`}>
                    {msg.type === 'image' ? (
                        <div className="flex flex-col gap-1">
                            {msg.fileUrl ? (
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="block max-w-[240px] rounded-lg overflow-hidden border border-white/10 shadow-sm hover:opacity-90 transition-opacity">
                                    <img src={msg.fileUrl} alt={msg.fileName || 'Adjunto'} className="w-full h-auto object-cover" />
                                </a>
                            ) : (
                                <div className="flex items-center gap-2 py-0.5">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-indigo-500/10'}`}>
                                        <i className={`fas fa-image text-sm ${isMine ? 'text-white/80' : 'text-indigo-500'}`}></i>
                                    </div>
                                    <div>
                                        <p className={`text-xs font-semibold ${isMine ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{msg.fileName || 'Imagen'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : msg.type === 'file' ? (
                        <div className="flex items-center gap-2 py-0.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-indigo-500/10'}`}>
                                <i className={`fas fa-file text-sm ${isMine ? 'text-white/80' : 'text-indigo-500'}`}></i>
                            </div>
                            <div>
                                <p className={`text-xs font-semibold ${isMine ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{msg.fileName || 'Archivo'}</p>
                                <p className={`text-[10px] ${isMine ? 'text-white/60' : 'text-slate-400'}`}>Archivo adjunto</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Time + Read Status */}
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                        <span className={`text-[9px] ${isMine ? 'text-white/50' : 'text-slate-400 dark:text-slate-500'}`}>
                            {formatTime(msg.createdAt)}
                        </span>
                        {isMine && <ReadStatusIcon status={msg.readStatus} small />}
                    </div>
                </div>

                {/* Hover Actions */}
                {showActions && (
                    <div className={`absolute top-0 ${isMine ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} flex items-center gap-0.5 px-1`}>
                        <button
                            onClick={() => onReply(msg)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors shadow-sm"
                            title="Responder"
                        >
                            <i className="fas fa-reply text-[9px]"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── New Conversation Modal ────────────────────────────────────
const NewConversationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string, type: 'direct' | 'group', participantIds: string[]) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const { directoryUsers, currentUserId } = useMessaging();
    const [type, setType] = useState<'direct' | 'group'>('direct');
    const [title, setTitle] = useState('');
    const [selected, setSelected] = useState<string[]>([]);

    // Derived contacts list from real users
    const contacts = directoryUsers
        .filter(u => u.id !== currentUserId)
        .map(u => {
            const parts = u.username.split(' ');
            const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : u.username.slice(0, 2).toUpperCase();
            return {
                id: u.id,
                name: u.username,
                role: u.role || 'Usuario',
                avatar: initials,
            };
        });

    if (!isOpen) return null;

    const handleCreate = () => {
        if (selected.length === 0) return;
        const finalTitle = type === 'direct'
            ? contacts.find(c => c.id === selected[0])?.name || ''
            : title || `Grupo (${selected.length + 1})`;
        onCreate(finalTitle, type, selected);
        onClose();
        setTitle('');
        setSelected([]);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-2xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.04]">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Nueva Conversación</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-400 transition-colors">
                        <i className="fas fa-times text-xs"></i>
                    </button>
                </div>

                {/* Type Toggle */}
                <div className="px-5 pt-4">
                    <div className="flex bg-slate-100 dark:bg-white/[0.04] rounded-xl p-0.5">
                        <button
                            onClick={() => { setType('direct'); setSelected([]); }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'direct' ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                        >
                            <i className="fas fa-user mr-1.5 text-[10px]"></i>Directo
                        </button>
                        <button
                            onClick={() => { setType('group'); setSelected([]); }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'group' ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                        >
                            <i className="fas fa-users mr-1.5 text-[10px]"></i>Grupal
                        </button>
                    </div>
                </div>

                {/* Group Title */}
                {type === 'group' && (
                    <div className="px-5 pt-3">
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Nombre del grupo..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                )}

                {/* Contacts */}
                <div className="p-5 space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Seleccionar Participantes</p>
                    {contacts.map(c => {
                        const isSelected = selected.includes(c.id);
                        return (
                            <button
                                key={c.id}
                                onClick={() => {
                                    if (type === 'direct') {
                                        setSelected([c.id]);
                                    } else {
                                        setSelected(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-transparent'}`}
                            >
                                <Avatar name={c.name} initials={c.avatar} size="sm" />
                                <div className="text-left flex-1">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.name}</p>
                                    <p className="text-[10px] text-slate-400">{c.role}</p>
                                </div>
                                {isSelected && (
                                    <div className="w-5 h-5 bg-indigo-500 rounded-md flex items-center justify-center">
                                        <i className="fas fa-check text-white text-[8px]"></i>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Action */}
                <div className="p-5 pt-0">
                    <button
                        onClick={handleCreate}
                        disabled={selected.length === 0}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Crear Conversación
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Empty State ──────────────────────────────────────────────
const EmptyChatState: React.FC = () => (
    <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/5 dark:to-violet-500/5 rounded-3xl flex items-center justify-center">
                <i className="fas fa-comments text-3xl text-indigo-400/60 dark:text-indigo-500/40"></i>
            </div>
            <h3 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Mensajería QMS</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Selecciona una conversación del panel izquierdo o crea una nueva para comenzar a colaborar con tu equipo.
            </p>
        </div>
    </div>
);

// ─── Main Messaging Component ─────────────────────────────────
const Messaging: React.FC = () => {
    const {
        conversations, activeConversationId, messages, soundEnabled, totalUnread,
        searchTerm, filterType, isLoading, isLoadingMessages,
        setActiveConversation, sendMessage, toggleSound,
        setSearchTerm, setFilterType, createConversation, currentUserId,
        directoryUsers, uploadAttachment
    } = useMessaging();

    const [inputText, setInputText] = useState('');
    const [showEmojis, setShowEmojis] = useState(false);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [showNewConvModal, setShowNewConvModal] = useState(false);
    const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'chats' | 'directory'>('chats');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const prevMessageCount = useRef(0);

    const activeConv = conversations.find(c => c.id === activeConversationId);

    // Filter conversations
    const filteredConversations = useMemo(() => {
        return conversations
            .filter(c => {
                if (filterType !== 'all' && c.type !== filterType) return false;
                if (searchTerm) {
                    const search = searchTerm.toLowerCase();
                    return c.title.toLowerCase().includes(search) ||
                        c.lastMessage?.content.toLowerCase().includes(search) ||
                        c.participants.some(p => p.username.toLowerCase().includes(search));
                }
                return true;
            })
            .sort((a, b) => {
                const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
                const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
                return bTime - aTime;
            });
    }, [conversations, filterType, searchTerm]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > prevMessageCount.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            // Track new messages for animation
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && prevMessageCount.current > 0) {
                setNewMessageIds(prev => new Set(prev).add(lastMsg.id));
                setTimeout(() => setNewMessageIds(prev => {
                    const next = new Set(prev);
                    next.delete(lastMsg.id);
                    return next;
                }), 600);
            }
        }
        prevMessageCount.current = messages.length;
    }, [messages]);

    // Focus input when conversation changes
    useEffect(() => {
        if (activeConversationId) {
            inputRef.current?.focus();
            setReplyTo(null);
            setInputText('');
            setMobileSidebarOpen(false);
        }
    }, [activeConversationId]);

    const handleSend = useCallback(() => {
        if (!inputText.trim()) return;
        sendMessage(inputText, 'text', replyTo || undefined);
        setInputText('');
        setReplyTo(null);
        inputRef.current?.focus();
    }, [inputText, replyTo, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Close emoji picker on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojis(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEmojiClick = (emojiObject: any) => {
        const cursor = inputRef.current?.selectionStart || inputText.length;
        const textAntes = inputText.slice(0, cursor);
        const textDespues = inputText.slice(cursor);
        setInputText(textAntes + emojiObject.emoji + textDespues);
    };

    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // Determinar tipo
        const isImage = file.type.startsWith('image/');
        const type = isImage ? 'image' : 'file';

        // Llamar a la función del context para subir y enviar
        uploadAttachment(file, type);

        // Reseteamos el input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Typing indicator names
    const typingNames = activeConv
        ? activeConv.participants.filter(p => p.isTyping && p.userId !== currentUserId).map(p => p.username)
        : [];

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.04] bg-white dark:bg-[#0b0f1a] shadow-xl">
            {/* ─── LEFT PANEL: Conversation List ─── */}
            <div className={`${isMobileSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[340px] lg:w-[380px] border-r border-slate-200/80 dark:border-white/[0.04] bg-white/70 dark:bg-[#0a0e18]/70 backdrop-blur-xl flex-shrink-0`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-white/[0.04]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center shadow-sm">
                                <i className="fas fa-comments text-white text-xs"></i>
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider leading-none">Mensajes</h2>
                                {totalUnread > 0 && (
                                    <span className="text-[9px] text-indigo-500 font-bold">{totalUnread} sin leer</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowNewConvModal(true)}
                            className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all"
                            title="Nueva conversación"
                        >
                            <i className="fas fa-plus text-xs"></i>
                        </button>
                    </div>

                    {/* Tabs / Segmented Control */}
                    <div className="flex bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl mb-3">
                        <button
                            onClick={() => setActiveTab('chats')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'chats' ? 'bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Conversaciones
                        </button>
                        <button
                            onClick={() => setActiveTab('directory')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'directory' ? 'bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Directorio <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 dark:text-slate-500"></i>
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={activeTab === 'chats' ? "Buscar conversación..." : "Buscar contacto..."}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] rounded-xl text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>

                    {/* Filters (only in Chats view) */}
                    {activeTab === 'chats' && (
                        <div className="flex gap-1 mt-2.5 overflow-x-auto no-scrollbar">
                            {([
                                { key: 'all', label: 'Todos', icon: 'fa-layer-group' },
                                { key: 'direct', label: 'Directos', icon: 'fa-user' },
                                { key: 'group', label: 'Grupos', icon: 'fa-users' },
                                { key: 'module-linked', label: 'Módulos', icon: 'fa-link' },
                            ] as const).map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilterType(f.key)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1
                                        ${filterType === f.key
                                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-200/40 dark:border-indigo-500/20'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent'
                                        }`}
                                >
                                    <i className={`fas ${f.icon} text-[8px]`}></i>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main List Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                            <div className="animate-spin text-xl text-indigo-500 mb-2"><i className="fas fa-circle-notch"></i></div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Cargando...</p>
                        </div>
                    ) : activeTab === 'chats' ? (
                        filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-center">
                                <i className="fas fa-inbox text-2xl text-slate-200 dark:text-slate-700 mb-2"></i>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    {searchTerm ? 'Sin resultados' : 'No hay conversaciones'}
                                </p>
                                <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-1">
                                    Inicia una desde el <button className="underline" onClick={() => setActiveTab('directory')}>Directorio</button>
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => (
                                <ConversationItem
                                    key={conv.id}
                                    conv={conv}
                                    isActive={conv.id === activeConversationId}
                                    onClick={() => setActiveConversation(conv.id)}
                                    currentUserId={currentUserId}
                                />
                            ))
                        )
                    ) : (
                        // Component for Directory Tab
                        <div className="space-y-1 pb-4">
                            <p className="px-2 pt-2 pb-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contactos de tu Organización</p>
                            {directoryUsers.map((contact) => {
                                const contactId = contact.id;
                                const match = searchTerm ? contact.username.toLowerCase().includes(searchTerm.toLowerCase()) : true;
                                if (!match || contactId === currentUserId) return null;

                                return (
                                    <button
                                        key={contactId}
                                        onClick={() => createConversation(contact.username, 'direct', [contactId])}
                                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar name={contact.username} size="sm" />
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{contact.username}</p>
                                                <p className="text-[10px] text-slate-400">{contact.role || 'Usuario'}</p>
                                            </div>
                                        </div>
                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <i className="fas fa-paper-plane text-[10px]"></i>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── RIGHT PANEL: Chat View ─── */}
            <div className={`${!isMobileSidebarOpen || !activeConversationId ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-slate-50/50 dark:bg-[#060a14]/50`}>
                {activeConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-white/80 dark:bg-[#0a0e18]/80 backdrop-blur-lg border-b border-slate-200/80 dark:border-white/[0.04]">
                            <div className="flex items-center gap-3">
                                {/* Mobile back button */}
                                <button
                                    onClick={() => { setActiveConversation(null); setMobileSidebarOpen(true); }}
                                    className="md:hidden w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-400"
                                >
                                    <i className="fas fa-arrow-left text-sm"></i>
                                </button>
                                <Avatar
                                    name={activeConv.title}
                                    isOnline={activeConv.type === 'direct' ? activeConv.participants.find(p => p.userId !== currentUserId)?.isOnline : undefined}
                                    size="md"
                                />
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white">{activeConv.title}</h3>
                                    <div className="flex items-center gap-1.5">
                                        {activeConv.linkedModule && (
                                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                                                <i className="fas fa-link mr-0.5 text-[7px]"></i>
                                                {activeConv.linkedId}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                            {activeConv.type === 'direct'
                                                ? (activeConv.participants.find(p => p.userId !== currentUserId)?.isOnline ? 'En línea' : 'Desconectado')
                                                : `${activeConv.participants.length} participantes`
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={toggleSound}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${soundEnabled
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border-indigo-200/40 dark:border-indigo-500/20'
                                        : 'bg-slate-50 dark:bg-white/[0.04] text-slate-400 border-slate-200/40 dark:border-white/[0.06]'
                                        }`}
                                    title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
                                >
                                    <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-xs`}></i>
                                </button>
                                {activeConv.type === 'group' && (
                                    <div className="hidden sm:flex items-center -space-x-1.5 ml-2">
                                        {activeConv.participants.slice(0, 4).map(p => (
                                            <div key={p.userId} className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-violet-400 rounded-lg flex items-center justify-center text-white text-[8px] font-black border-2 border-white dark:border-[#0a0e18]">
                                                {p.avatar || p.username.charAt(0)}
                                            </div>
                                        ))}
                                        {activeConv.participants.length > 4 && (
                                            <div className="w-6 h-6 bg-slate-200 dark:bg-white/[0.08] rounded-lg flex items-center justify-center text-[8px] font-black text-slate-500 border-2 border-white dark:border-[#0a0e18]">
                                                +{activeConv.participants.length - 4}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-1">
                            {isLoadingMessages && messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin text-2xl text-indigo-500 mb-3"><i className="fas fa-circle-notch"></i></div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cargando mensajes...</p>
                                    </div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="w-14 h-14 mx-auto mb-4 bg-indigo-500/5 rounded-2xl flex items-center justify-center">
                                            <i className="fas fa-paper-plane text-lg text-indigo-400/40"></i>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold">No hay mensajes aún</p>
                                        <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-1">¡Sé el primero en escribir!</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messageGroups.map(group => (
                                        <div key={group.date}>
                                            {/* Date Separator */}
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.04]"></div>
                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{group.date}</span>
                                                <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.04]"></div>
                                            </div>
                                            {/* Messages */}
                                            {group.messages.map((msg, idx) => {
                                                const isMine = msg.senderId === currentUserId;
                                                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                                                const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
                                                return (
                                                    <div key={msg.id} className={showAvatar ? 'mt-3' : 'mt-0.5'}>
                                                        <MessageBubble
                                                            msg={msg}
                                                            isMine={isMine}
                                                            showAvatar={showAvatar}
                                                            onReply={setReplyTo}
                                                            isNew={newMessageIds.has(msg.id)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    <TypingIndicator names={typingNames} />
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="px-4 pb-4 pt-2 bg-white/80 dark:bg-[#0a0e18]/80 backdrop-blur-lg border-t border-slate-200/80 dark:border-white/[0.04]">
                            {/* Reply Preview */}
                            {replyTo && (
                                <div className="flex items-center justify-between mb-2 pl-3 pr-2 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/40 dark:border-indigo-500/20 rounded-xl animate-fade-in">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-0.5 h-6 bg-indigo-500 rounded-full flex-shrink-0"></div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-300">Respondiendo a {replyTo.senderName}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{replyTo.content}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="w-5 h-5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                                        <i className="fas fa-times text-[8px]"></i>
                                    </button>
                                </div>
                            )}

                            {/* Input Row */}
                            <div className="flex items-end gap-2 relative">
                                <div className="absolute bottom-full mb-2 left-0 z-50 animate-fade-in" ref={emojiPickerRef} style={{ display: showEmojis ? 'block' : 'none' }}>
                                    <EmojiPicker
                                        onEmojiClick={handleEmojiClick}
                                        theme={Theme.AUTO}
                                        lazyLoadEmojis
                                        searchDisabled
                                        skinTonesDisabled
                                        width={280}
                                        height={350}
                                    />
                                </div>
                                <button
                                    onClick={() => setShowEmojis(!showEmojis)}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0
                                        ${showEmojis ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500' : 'bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-slate-400 hover:text-indigo-500 hover:border-indigo-500/30'}`}
                                    title="Emojis"
                                >
                                    <i className="fas fa-smile text-sm"></i>
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileAttach}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-500/30 transition-all flex-shrink-0"
                                    title="Adjuntar archivo o foto"
                                >
                                    <i className="fas fa-paperclip text-sm"></i>
                                </button>
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={inputRef}
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribe un mensaje..."
                                        rows={1}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none custom-scrollbar"
                                        style={{ minHeight: '38px', maxHeight: '120px' }}
                                    />
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={!inputText.trim()}
                                    className="w-9 h-9 bg-gradient-to-r from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex-shrink-0"
                                    title="Enviar"
                                >
                                    <i className="fas fa-paper-plane text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <EmptyChatState />
                )}
            </div>

            {/* New Conversation Modal */}
            <NewConversationModal
                isOpen={showNewConvModal}
                onClose={() => setShowNewConvModal(false)}
                onCreate={createConversation}
            />
        </div>
    );
};

export default Messaging;
