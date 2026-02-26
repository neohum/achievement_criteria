"use client";

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AchievementCriteria } from '@/types';
import { useBoard } from '@/contexts/BoardContext';
import * as Y from 'yjs';

const LOCAL_ORIGIN = 'local';

interface CriteriaNodeProps {
    id: string;
    data: {
        criteria: AchievementCriteria;
        memo: string;
    };
}

/**
 * Simple diff: find common prefix & suffix, then compute a single delete+insert
 * inside one Yjs transaction. This preserves remote cursor positions.
 */
function applyDiffToYText(yText: Y.Text, oldText: string, newText: string) {
    if (oldText === newText) return;

    let prefixLen = 0;
    const minLen = Math.min(oldText.length, newText.length);
    while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
        prefixLen++;
    }

    let suffixLen = 0;
    while (
        suffixLen < (minLen - prefixLen) &&
        oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
    ) {
        suffixLen++;
    }

    const deleteCount = oldText.length - prefixLen - suffixLen;
    const insertText = newText.slice(prefixLen, newText.length - suffixLen);

    // Wrap in a single transaction to avoid intermediate states for remote peers
    yText.doc!.transact(() => {
        if (deleteCount > 0) {
            yText.delete(prefixLen, deleteCount);
        }
        if (insertText.length > 0) {
            yText.insert(prefixLen, insertText);
        }
    }, LOCAL_ORIGIN);
}

function MemoTextarea({ id, value, updateMemo }: { id: string; value: string; updateMemo: (id: string, memo: string) => void }) {
    const { yMemos, yjsSynced } = useBoard();
    const [localValue, setLocalValue] = useState(value);
    const composingRef = useRef(false);
    const yTextRef = useRef<Y.Text | null>(null);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Get or create Y.Text for this card
    useEffect(() => {
        if (!yMemos) return;

        let yText = yMemos.get(id);
        if (!yText) {
            // Only seed with DB value after Yjs has synced — otherwise we might
            // duplicate text if two clients initialize before sync completes
            if (!yjsSynced) return;
            yText = new Y.Text();
            if (value) {
                yText.insert(0, value);
            }
            yMemos.set(id, yText);
        }
        yTextRef.current = yText;

        // Set initial local value from Yjs (it may differ from prop if another user edited)
        const currentYjsText = yText.toString();
        if (currentYjsText) {
            setLocalValue(currentYjsText);
        }

        // Observe only remote changes (skip local-origin transactions)
        const observer = (event: Y.YTextEvent) => {
            if (event.transaction.origin === LOCAL_ORIGIN) return;
            const text = yTextRef.current?.toString() ?? "";
            setLocalValue(text);
        };
        yText.observe(observer);

        return () => {
            yText.unobserve(observer);
            yTextRef.current = null;
        };
    }, [yMemos, yjsSynced, id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fallback: sync from parent prop when Yjs is not available
    useEffect(() => {
        if (yMemos) return; // Yjs is managing this
        if (!composingRef.current) {
            setLocalValue(value);
        }
    }, [value, yMemos]);

    // Periodically persist Yjs text to node state (for Redis/Postgres saving)
    const schedulePersist = useCallback((text: string) => {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            updateMemo(id, text);
        }, 500);
    }, [id, updateMemo]);

    useEffect(() => {
        return () => clearTimeout(persistTimerRef.current);
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (yTextRef.current && !composingRef.current) {
            const oldText = yTextRef.current.toString();
            applyDiffToYText(yTextRef.current, oldText, newValue);
            schedulePersist(newValue);
        } else if (!yTextRef.current) {
            // Fallback: no Yjs
            updateMemo(id, newValue);
        }
    }, [id, updateMemo, schedulePersist]);

    const handleCompositionStart = useCallback(() => {
        composingRef.current = true;
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
        composingRef.current = false;
        const newValue = (e.target as HTMLTextAreaElement).value;
        setLocalValue(newValue);

        if (yTextRef.current) {
            const oldText = yTextRef.current.toString();
            applyDiffToYText(yTextRef.current, oldText, newValue);
            schedulePersist(newValue);
        } else {
            updateMemo(id, newValue);
        }
    }, [id, updateMemo, schedulePersist]);

    return (
        <div className="pl-1 md:pl-2 mt-1 md:mt-2 nodrag">
            <textarea
                value={localValue}
                onChange={handleChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="메모를 입력하세요 (예: 4주차 수업)"
                className="w-full text-sm bg-yellow-50/50 border border-yellow-200 rounded-lg p-2 min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-yellow-700/40"
                onPointerDown={(e) => e.stopPropagation()}
            />
        </div>
    );
}

function CriteriaNode({ id, data }: CriteriaNodeProps) {
    const { updateMemo, removeNode, nodes } = useBoard();
    const { criteria, memo: nodeMemo } = data;

    // Find index of this node type among all nodes to calculate sequence number if duplicate codes exist
    const sameCodeNodes = nodes.filter(n => (n.data?.criteria as AchievementCriteria)?.code === criteria.code);
    const count = sameCodeNodes.length;
    let thisOccurence = 0;
    if (count > 1) {
        thisOccurence = sameCodeNodes.findIndex(n => n.id === id) + 1;
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 flex flex-col gap-2 md:gap-3 relative group w-72 md:w-80 hover:shadow-md transition-shadow">
            <Handle id="top-target" type="target" position={Position.Top} className="!w-3 !h-3 !bg-transparent !border-2 !border-orange-400 hover:!w-4 hover:!h-4 hover:!border-orange-500 transition-all !rounded-full" />
            <Handle id="left-target" type="target" position={Position.Left} className="!w-3 !h-3 !bg-transparent !border-2 !border-orange-400 hover:!w-4 hover:!h-4 hover:!border-orange-500 transition-all !rounded-full" />

            {/* Drag Handle (implicitly the whole node in React Flow unless restricted) & Delete Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap nodrag">
                    <span className="px-1.5 md:px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] md:text-xs font-semibold">{criteria.gradeGroup}</span>
                    <span className="px-1.5 md:px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] md:text-xs font-semibold">{criteria.subject}</span>
                    {criteria.domain && (
                        <span className="px-1.5 md:px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] md:text-xs font-semibold">{criteria.domain}</span>
                    )}
                    <span className="px-1.5 md:px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] md:text-xs font-bold">{criteria.code}</span>

                    {/* Usage Count Badge */}
                    {count > 1 && (
                        <span className="px-1.5 md:px-2 py-0.5 bg-slate-800 text-white rounded-full text-[10px] md:text-xs font-bold shadow-sm">
                            {thisOccurence} / {count}번
                        </span>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        removeNode(id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all shrink-0 nodrag cursor-pointer"
                    title="삭제"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* Description */}
            <div className="text-sm md:text-base text-gray-800 font-medium pl-1 md:pl-2">
                {criteria.description}
            </div>

            {/* Memo area */}
            <MemoTextarea id={id} value={nodeMemo} updateMemo={updateMemo} />

            <Handle id="bottom-source" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-transparent !border-2 !border-orange-400 hover:!w-4 hover:!h-4 hover:!border-orange-500 transition-all !rounded-full" />
            <Handle id="right-source" type="source" position={Position.Right} className="!w-3 !h-3 !bg-transparent !border-2 !border-orange-400 hover:!w-4 hover:!h-4 hover:!border-orange-500 transition-all !rounded-full" />
        </div>
    );
}

export default memo(CriteriaNode);
