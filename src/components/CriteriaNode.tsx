"use client";

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AchievementCriteria } from '@/types';
import { useBoard } from '@/contexts/BoardContext';

interface CriteriaNodeProps {
    id: string;
    data: {
        criteria: AchievementCriteria;
        memo: string;
    };
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
            <div className="pl-1 md:pl-2 mt-1 md:mt-2 nodrag">
                <textarea
                    value={nodeMemo}
                    onChange={(e) => updateMemo(id, e.target.value)}
                    placeholder="메모를 입력하세요 (예: 4주차 수업)"
                    className="w-full text-sm bg-yellow-50/50 border border-yellow-200 rounded-lg p-2 min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-yellow-700/40"
                    onPointerDown={(e) => e.stopPropagation()}
                />
            </div>

            <Handle id="bottom-source" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-transparent !border-2 !border-orange-400 hover:!w-4 hover:!h-4 hover:!border-orange-500 transition-all !rounded-full" />
            <Handle id="right-source" type="source" position={Position.Right} className="!w-3 !h-3 !bg-transparent !border-2 !border-orange-400 hover:!w-4 hover:!h-4 hover:!border-orange-500 transition-all !rounded-full" />
        </div>
    );
}

export default memo(CriteriaNode);
