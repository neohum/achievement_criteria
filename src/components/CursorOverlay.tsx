"use client";

import React from 'react';
import { useViewport } from '@xyflow/react';
import { useBoard } from '@/contexts/BoardContext';

export default function CursorOverlay() {
    const { remoteCursors } = useBoard();
    const viewport = useViewport();

    if (remoteCursors.size === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from(remoteCursors.values()).map((cursor) => {
                // Convert flow coordinates to container-local coordinates
                const localX = cursor.x * viewport.zoom + viewport.x;
                const localY = cursor.y * viewport.zoom + viewport.y;

                return (
                    <div
                        key={cursor.sessionId}
                        className="absolute transition-all duration-75 ease-out"
                        style={{
                            left: localX,
                            top: localY,
                            transform: 'translate(-2px, -2px)',
                        }}
                    >
                        {/* Cursor arrow SVG */}
                        <svg
                            width="20"
                            height="24"
                            viewBox="0 0 20 24"
                            fill="none"
                            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                        >
                            <path
                                d="M1 1L1 18L5.5 13.5L10 22L13 20.5L8.5 12L15 12L1 1Z"
                                fill={cursor.color}
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />
                        </svg>

                        {/* Session label */}
                        <div
                            className="absolute left-4 top-5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
                            style={{ backgroundColor: cursor.color }}
                        >
                            {cursor.sessionId.slice(0, 8)}
                        </div>

                        {/* Drag ghost */}
                        {cursor.dragging && cursor.dragCardTitle && (
                            <div
                                className="absolute left-6 top-10 px-3 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap shadow-lg opacity-80 max-w-48 truncate"
                                style={{ backgroundColor: cursor.color }}
                            >
                                {cursor.dragCardTitle}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
