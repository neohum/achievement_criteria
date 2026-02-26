"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AchievementCriteria, BoardCard, BoardEdge } from '@/types';
import { useNodesState, useEdgesState, addEdge, applyEdgeChanges, Connection, Edge, EdgeChange, NodeChange, Node } from '@xyflow/react';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/useWebSocket';

export interface RemoteCursor {
    sessionId: string;
    color: string;
    x: number;
    y: number;
    dragging?: boolean;
    dragCardId?: string;
    dragCardTitle?: string;
    lastUpdate: number;
}

interface BoardContextType {
    boardId: string;
    allCriteria: AchievementCriteria[];
    gradeGroupFilter: string;
    setGradeGroupFilter: (v: string) => void;
    subjectFilter: string;
    setSubjectFilter: (v: string) => void;
    domainFilter: string;
    setDomainFilter: (v: string) => void;
    availableGradeGroups: string[];
    availableSubjects: string[];
    availableDomains: string[];
    filteredCriteria: AchievementCriteria[];
    nodes: Node[];
    edges: Edge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
    updateMemo: (id: string, memo: string) => void;
    removeNode: (id: string) => void;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    activeUsers: string[];
    remoteCursors: Map<string, RemoteCursor>;
    myColor: string;
    sendCursorPosition: (flowX: number, flowY: number) => void;
    sendDragStart: (cardId: string, cardTitle: string) => void;
    sendDragEnd: () => void;
    isWsConnected: boolean;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

// 3~5, 3~6, 3~7 등을 모두 "3~4"로 통합
function normalizeGradeGroup(g: string): string {
    if (/^3~[4-9]$/.test(g)) return "3~4";
    return g;
}

export function BoardProvider({ children, initialCriteria, boardId }: { children: React.ReactNode; initialCriteria: AchievementCriteria[]; boardId: string }) {
    const [allCriteria] = useState(initialCriteria);
    const [gradeGroupFilter, setGradeGroupFilter] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");
    const [domainFilter, setDomainFilter] = useState("");

    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges] = useEdgesState<Edge>([]);

    const [isMounted, setIsMounted] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [activeUsers, setActiveUsers] = useState<string[]>([]);
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
    const [myColor, setMyColor] = useState<string>('#3b82f6');
    // Timestamp of last remote update — skip autosave within this window
    const lastRemoteUpdateRef = useRef(0);

    // Throttle ref for cursor position
    const lastCursorSendRef = useRef(0);

    // Update sequence numbers for all edges whenever edges change
    const updateEdgeSequences = useCallback((currentEdges: Edge[]) => {
        return currentEdges.map((e, index) => ({
            ...e,
            data: { ...e.data, sequenceNumber: index + 1 }
        }));
    }, []);

    // Apply edge changes + sequencing atomically in one setEdges call (no cascading effect)
    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        setEdges((eds) => {
            const updated = applyEdgeChanges(changes, eds);
            return updateEdgeSequences(updated);
        });
    }, [setEdges, updateEdgeSequences]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => {
            // Check if the source handle already has an outgoing connection
            const sourceLimit = eds.some(e => e.source === params.source && e.sourceHandle === params.sourceHandle);
            // Check if the target handle already has an incoming connection
            const targetLimit = eds.some(e => e.target === params.target && e.targetHandle === params.targetHandle);

            if (sourceLimit || targetLimit) {
                toast.warning("각 연결점은 하나씩만 연결할 수 있습니다.");
                return eds;
            }

            const newEdges = addEdge({ ...params, type: 'customEdge' }, eds);
            return updateEdgeSequences(newEdges);
        }),
        [setEdges, updateEdgeSequences]
    );

    // WebSocket message handler
    const handleWsMessage = useCallback((msg: any) => {
        switch (msg.type) {
            case 'init': {
                setMyColor(msg.color);
                const users = (msg.users || []).map((u: any) => u.sessionId);
                setActiveUsers(users);
                break;
            }
            case 'presence': {
                const users = (msg.users || []).map((u: any) => u.sessionId);
                setActiveUsers(users);
                break;
            }
            case 'update': {
                // Board data update from another user — block autosave for 2s
                lastRemoteUpdateRef.current = Date.now();
                if (msg.cards) {
                    const flowNodes: Node[] = msg.cards.map((c: BoardCard) => ({
                        id: c.id,
                        type: 'criteriaNode',
                        position: c.position || { x: 50, y: 50 },
                        data: {
                            criteria: c.criteria,
                            memo: c.memo || ""
                        }
                    }));
                    setNodes(flowNodes);
                }
                if (msg.edges) {
                    let flowEdges: Edge[] = msg.edges.map((e: BoardEdge) => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        sourceHandle: e.sourceHandle,
                        targetHandle: e.targetHandle,
                        type: 'customEdge'
                    }));
                    flowEdges = updateEdgeSequences(flowEdges);
                    setEdges(flowEdges);
                }
                break;
            }
            case 'cursor': {
                setRemoteCursors(prev => {
                    const next = new Map(prev);
                    const existing = next.get(msg.sessionId);
                    next.set(msg.sessionId, {
                        sessionId: msg.sessionId,
                        color: msg.color,
                        x: msg.x,
                        y: msg.y,
                        dragging: existing?.dragging || false,
                        dragCardId: existing?.dragCardId,
                        dragCardTitle: existing?.dragCardTitle,
                        lastUpdate: Date.now(),
                    });
                    return next;
                });
                break;
            }
            case 'drag-start': {
                setRemoteCursors(prev => {
                    const next = new Map(prev);
                    const existing = next.get(msg.sessionId);
                    if (existing) {
                        next.set(msg.sessionId, {
                            ...existing,
                            dragging: true,
                            dragCardId: msg.cardId,
                            dragCardTitle: msg.cardTitle,
                            lastUpdate: Date.now(),
                        });
                    }
                    return next;
                });
                break;
            }
            case 'drag-end': {
                setRemoteCursors(prev => {
                    const next = new Map(prev);
                    const existing = next.get(msg.sessionId);
                    if (existing) {
                        next.set(msg.sessionId, {
                            ...existing,
                            dragging: false,
                            dragCardId: undefined,
                            dragCardTitle: undefined,
                            lastUpdate: Date.now(),
                        });
                    }
                    return next;
                });
                break;
            }
            case 'cursor-leave': {
                setRemoteCursors(prev => {
                    const next = new Map(prev);
                    next.delete(msg.sessionId);
                    return next;
                });
                break;
            }
        }
    }, [setNodes, setEdges, updateEdgeSequences]);

    const { send, isConnected: isWsConnected } = useWebSocket({
        boardId,
        sessionId,
        onMessage: handleWsMessage,
    });

    const sendCursorPosition = useCallback((flowX: number, flowY: number) => {
        const now = Date.now();
        if (now - lastCursorSendRef.current < 50) return; // 50ms throttle
        lastCursorSendRef.current = now;
        send({ type: 'cursor', x: flowX, y: flowY });
    }, [send]);

    const sendDragStart = useCallback((cardId: string, cardTitle: string) => {
        send({ type: 'drag-start', cardId, cardTitle });
    }, [send]);

    const sendDragEnd = useCallback(() => {
        send({ type: 'drag-end' });
    }, [send]);

    // Stale cursor cleanup (10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setRemoteCursors(prev => {
                const now = Date.now();
                let changed = false;
                const next = new Map(prev);
                for (const [sid, cursor] of next) {
                    if (now - cursor.lastUpdate > 10000) {
                        next.delete(sid);
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setIsMounted(true);
        let sid = localStorage.getItem('achievement_board_session');
        if (!sid) {
            sid = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('achievement_board_session', sid);
        }
        setSessionId(sid);

        // Fetch initial data based on boardId
        fetch(`/api/board?boardId=${boardId}`)
            .then(res => res.json())
            .then(data => {
                if (data.cards && data.cards.length > 0) {
                    lastRemoteUpdateRef.current = Date.now();
                    const flowNodes: Node[] = data.cards.map((c: BoardCard, index: number) => ({
                        id: c.id,
                        type: 'criteriaNode',
                        position: c.position || { x: 50, y: 50 + index * 100 },
                        data: {
                            criteria: c.criteria,
                            memo: c.memo || ""
                        }
                    }));
                    setNodes(flowNodes);
                }

                if (data.edges && data.edges.length > 0) {
                    lastRemoteUpdateRef.current = Date.now();
                    let flowEdges: Edge[] = data.edges.map((e: BoardEdge) => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        sourceHandle: e.sourceHandle,
                        targetHandle: e.targetHandle,
                        type: 'customEdge'
                    }));
                    flowEdges = updateEdgeSequences(flowEdges);
                    setEdges(flowEdges);
                }
            })
            .catch(() => toast.error("보드 데이터를 불러오는데 실패했습니다."));

        // SSE is no longer needed — WebSocket handles real-time sync
    }, [boardId, setNodes, setEdges, updateEdgeSequences]);

    // Autosave effect with debounce
    useEffect(() => {
        if (!isMounted || !boardId || !sessionId) return;

        // Skip save if this change came from a remote update (within 2s window)
        if (Date.now() - lastRemoteUpdateRef.current < 2000) return;

        setSaveStatus('saving');
        const timer = setTimeout(() => {
            // Double-check before actually saving — remote update may have arrived during debounce
            if (Date.now() - lastRemoteUpdateRef.current < 2000) return;
            // Convert to DB format
            const boardCards: BoardCard[] = nodes.map(n => ({
                id: n.id,
                position: n.position,
                criteria: n.data.criteria as AchievementCriteria,
                memo: (n.data.memo as string) || ""
            }));

            const boardEdges: BoardEdge[] = edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle
            }));

            fetch('/api/board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardId, sessionId, cards: boardCards, edges: boardEdges })
            })
                .then(res => {
                    if (res.ok) setSaveStatus('saved');
                    else {
                        setSaveStatus('error');
                        toast.error("저장에 실패했습니다.");
                    }
                })
                .catch(() => {
                    setSaveStatus('error');
                    toast.error("저장에 실패했습니다.");
                });
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [nodes, edges, sessionId, isMounted]);

    const availableGradeGroups = useMemo(() => {
        const groups = new Set<string>();
        allCriteria.forEach(c => {
            if (c.gradeGroup) groups.add(normalizeGradeGroup(c.gradeGroup));
        });
        return Array.from(groups).sort();
    }, [allCriteria]);

    const availableSubjects = useMemo(() => {
        if (!gradeGroupFilter) return [];
        const subjects = new Set<string>();
        allCriteria.forEach(c => {
            if (normalizeGradeGroup(c.gradeGroup) === gradeGroupFilter) subjects.add(c.subject);
        });
        return Array.from(subjects);
    }, [allCriteria, gradeGroupFilter]);

    const availableDomains = useMemo(() => {
        if (!gradeGroupFilter || !subjectFilter) return [];
        const domains = new Set<string>();
        allCriteria.forEach(c => {
            if (normalizeGradeGroup(c.gradeGroup) === gradeGroupFilter && c.subject === subjectFilter && c.domain) {
                domains.add(c.domain);
            }
        });
        return Array.from(domains);
    }, [allCriteria, gradeGroupFilter, subjectFilter]);

    const filteredCriteria = useMemo(() => {
        return allCriteria.filter(c =>
            (gradeGroupFilter ? normalizeGradeGroup(c.gradeGroup) === gradeGroupFilter : true) &&
            (subjectFilter ? c.subject === subjectFilter : true) &&
            (domainFilter ? c.domain === domainFilter : true)
        );
    }, [allCriteria, gradeGroupFilter, subjectFilter, domainFilter]);

    // When grade group changes, reset subject and domain
    useEffect(() => {
        setSubjectFilter("");
        setDomainFilter("");
    }, [gradeGroupFilter]);

    // When subject changes, reset domain
    useEffect(() => {
        setDomainFilter("");
    }, [subjectFilter]);

    const updateMemo = (id: string, memo: string) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, memo } } : n));
    };

    const removeNode = (id: string) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    };

    if (!isMounted) return null;

    return (
        <BoardContext.Provider value={{
            boardId,
            allCriteria,
            gradeGroupFilter, setGradeGroupFilter,
            subjectFilter, setSubjectFilter,
            domainFilter, setDomainFilter,
            availableGradeGroups,
            availableSubjects,
            availableDomains,
            filteredCriteria,
            nodes, edges,
            onNodesChange, onEdgesChange, onConnect,
            setNodes, setEdges,
            updateMemo, removeNode,
            saveStatus, activeUsers,
            remoteCursors, myColor,
            sendCursorPosition, sendDragStart, sendDragEnd,
            isWsConnected,
        }}>
            {children}
        </BoardContext.Provider>
    );
}

export const useBoard = () => {
    const ctx = useContext(BoardContext);
    if (!ctx) throw new Error("useBoard must be used within BoardProvider");
    return ctx;
};
