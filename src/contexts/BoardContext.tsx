"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { AchievementCriteria, BoardCard } from '@/types';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';

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
    boardCards: BoardCard[];
    setBoardCards: React.Dispatch<React.SetStateAction<BoardCard[]>>;
    updateMemo: (id: string, memo: string) => void;
    removeCard: (id: string) => void;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    activeUsers: string[];
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
    const [boardCards, setBoardCards] = useState<BoardCard[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [activeUsers, setActiveUsers] = useState<string[]>([]);
    const ignoreNextSave = useRef(false);

    useEffect(() => {
        setIsMounted(true);
        // We still fetch sessionId if needed, but mainly rely on boardId
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
                    ignoreNextSave.current = true;
                    setBoardCards(data.cards);
                }
            })
            .catch(() => toast.error("보드 데이터를 불러오는데 실패했습니다."));

        // Setup SSE for real-time sync with presence
        const eventSource = new EventSource(`/api/board/stream?boardId=${boardId}&sessionId=${sid}`);
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update' && data.sessionId !== sid) {
                    // Update from another user
                    ignoreNextSave.current = true;
                    setBoardCards(data.cards);
                } else if (data.type === 'presence') {
                    // Update active users
                    setActiveUsers(data.users || []);
                }
            } catch (err) {
                console.error("SSE parse error", err);
            }
        };

        return () => {
            eventSource.close();
        };
    }, [boardId]);

    // Autosave effect with debounce
    useEffect(() => {
        if (!isMounted || !boardId || !sessionId) return;

        if (ignoreNextSave.current) {
            ignoreNextSave.current = false;
            return;
        }

        setSaveStatus('saving');
        const timer = setTimeout(() => {
            fetch('/api/board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardId, sessionId, cards: boardCards })
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
    }, [boardCards, sessionId, isMounted]);

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
        setBoardCards(prev => prev.map(c => c.id === id ? { ...c, memo } : c));
    };

    const removeCard = (id: string) => {
        setBoardCards(prev => prev.filter(c => c.id !== id));
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return; // Dropped outside

        // Reordering within the main board
        if (source.droppableId === 'main-board' && destination.droppableId === 'main-board') {
            const newCards = Array.from(boardCards);
            const [movedCard] = newCards.splice(source.index, 1);
            newCards.splice(destination.index, 0, movedCard);
            setBoardCards(newCards);
            return;
        }

        // Dragging from main board to trash
        if (source.droppableId === 'main-board' && destination.droppableId === 'trash') {
            const newCards = Array.from(boardCards);
            newCards.splice(source.index, 1);
            setBoardCards(newCards);
            return;
        }

        // Dragging from sidebar to main board
        if (source.droppableId === 'sidebar-list' && destination.droppableId === 'main-board') {
            const sourceCriteria = filteredCriteria[source.index];
            if (sourceCriteria) {
                const newCard: BoardCard = {
                    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    criteria: sourceCriteria,
                    memo: ""
                };
                const newCards = Array.from(boardCards);
                newCards.splice(destination.index, 0, newCard);
                setBoardCards(newCards);
            }
            return;
        }
    };

    if (!isMounted) return null; // Avoid hydration mismatch on DragDropContext

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
            boardCards, setBoardCards,
            updateMemo, removeCard,
            saveStatus, activeUsers
        }}>
            <DragDropContext onDragEnd={onDragEnd}>
                {children}
            </DragDropContext>
        </BoardContext.Provider>
    );
}

export const useBoard = () => {
    const ctx = useContext(BoardContext);
    if (!ctx) throw new Error("useBoard must be used within BoardProvider");
    return ctx;
};
