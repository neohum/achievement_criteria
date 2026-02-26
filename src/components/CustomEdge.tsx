"use client";

import React, { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';

function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const sequenceNumber = data?.sequenceNumber as number | undefined;

    return (
        <>
            <style>{`
                @keyframes flowAnimation {
                    from { stroke-dashoffset: 24; }
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: 2,
                    stroke: '#3b82f6',
                    strokeDasharray: '6 6',
                    animation: 'flowAnimation 1s linear infinite'
                }}
                id={id}
            />
            <EdgeLabelRenderer>
                {sequenceNumber !== undefined && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            background: '#3b82f6',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            pointerEvents: 'all',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                        className="nodrag nopan"
                    >
                        {sequenceNumber}
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
}

export default memo(CustomEdge);
