import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import prisma from '@/lib/prisma';
import { BoardCard } from '@/types';

export async function POST(req: Request) {
    try {
        const { boardId, sessionId, cards, edges = [] } = await req.json();

        if (!boardId || !Array.isArray(cards)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // 1. Save to Redis for real-time speed (overwrite)
        await redis.set(`board:${boardId}`, JSON.stringify({ cards, edges }));

        // 2. Publish to Redis Pub/Sub for SSE clients
        await redis.publish(`board-events:${boardId}`, JSON.stringify({
            type: 'update',
            sessionId,
            cards,
            edges
        }));

        // For demonstration/simplicity without a dedicated cron worker, 
        // we do an asynchronous "fire and forget" update to Postgres to ensure durability.
        upsertDatabase(boardId, sessionId, cards, edges).catch(err => console.error("DB Upsert Error", err));

        return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
    } catch (error) {
        console.error('Save API Error:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}

async function upsertDatabase(boardId: string, sessionId: string, cards: BoardCard[], edges: any[] = []) {
    // Ensure session exists if sessionId is provided
    if (sessionId) {
        await prisma.session.upsert({
            where: { id: sessionId },
            update: {},
            create: { id: sessionId },
        });
    }

    // Update board data
    await prisma.board.update({
        where: { id: boardId },
        data: { data: { cards, edges } as any },
    });
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const boardId = searchParams.get('boardId');

        if (!boardId) {
            return NextResponse.json({ error: 'Missing boardId' }, { status: 400 });
        }

        // Attempt to load from Redis first
        const cachedData = await redis.get(`board:${boardId}`);

        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            // Handle backwards compatibility where cache might just be an array
            if (Array.isArray(parsed)) {
                return NextResponse.json({ source: 'redis', cards: parsed, edges: [] });
            }
            return NextResponse.json({ source: 'redis', cards: parsed.cards || [], edges: parsed.edges || [] });
        }

        // Fallback to PostgreSQL
        const dbBoard = await prisma.board.findUnique({
            where: { id: boardId },
        });

        if (dbBoard && dbBoard.data) {
            const data: any = dbBoard.data;
            const cards = Array.isArray(data) ? data : (data.cards || []);
            const edges = Array.isArray(data) ? [] : (data.edges || []);

            // Restore cache
            await redis.set(`board:${boardId}`, JSON.stringify({ cards, edges }));
            return NextResponse.json({ source: 'database', cards, edges });
        }

        return NextResponse.json({ source: 'none', cards: [], edges: [] });
    } catch (error) {
        console.error('Load API Error:', error);
        return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
    }
}
