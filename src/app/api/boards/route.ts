import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        // Fetch all boards (owned or visited)
        const boards = await prisma.board.findMany({
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, updatedAt: true, createdAt: true }
        });

        return NextResponse.json({ boards });
    } catch (error) {
        console.error('Fetch Boards API Error:', error);
        return NextResponse.json({ error: 'Failed to load boards' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const boardId = searchParams.get('boardId');

        if (!boardId) {
            return NextResponse.json({ error: 'Missing boardId' }, { status: 400 });
        }

        await prisma.board.delete({ where: { id: boardId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Board API Error:', error);
        return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { sessionId, title } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        // Ensure session exists
        const session = await prisma.session.upsert({
            where: { id: sessionId },
            update: {},
            create: { id: sessionId }
        });

        // Create new board
        const board = await prisma.board.create({
            data: {
                sessionId: session.id,
                title: title || "새 작업 공간",
                data: []
            }
        });

        return NextResponse.json({ board });
    } catch (error) {
        console.error('Create Board API Error:', error);
        return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
    }
}
