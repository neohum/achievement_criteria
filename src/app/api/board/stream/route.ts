import { NextRequest } from 'next/server';
import { Redis } from 'ioredis';
import redisClient from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const boardId = req.nextUrl.searchParams.get('boardId');
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!boardId || !sessionId) {
        return new Response('Missing boardId or sessionId', { status: 400 });
    }

    const subscriber = new Redis(process.env.REDIS_URL as string);

    const stream = new ReadableStream({
        async start(controller) {
            // 1. Add to presence
            await redisClient.sadd(`board-presence:${boardId}`, sessionId);
            const currentPresence = await redisClient.smembers(`board-presence:${boardId}`);
            await redisClient.publish(`board-events:${boardId}`, JSON.stringify({ type: 'presence', users: currentPresence }));

            // 2. Initial presence emit directly to this client
            controller.enqueue(`data: ${JSON.stringify({ type: 'presence', users: currentPresence })}\n\n`);

            subscriber.subscribe(`board-events:${boardId}`, (err) => {
                if (err) {
                    console.error("Failed to subscribe:", err);
                    controller.error(err);
                }
            });

            subscriber.on('message', (channel, message) => {
                if (channel === `board-events:${boardId}`) {
                    controller.enqueue(`data: ${message}\n\n`);
                }
            });

            // Handle client disconnect
            req.signal.addEventListener('abort', async () => {
                subscriber.unsubscribe();
                subscriber.quit();

                await redisClient.srem(`board-presence:${boardId}`, sessionId);
                const updatedPresence = await redisClient.smembers(`board-presence:${boardId}`);
                await redisClient.publish(`board-events:${boardId}`, JSON.stringify({ type: 'presence', users: updatedPresence }));
            });
        },
        async cancel() {
            subscriber.unsubscribe();
            subscriber.quit();
            await redisClient.srem(`board-presence:${boardId}`, sessionId);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Content-Encoding': 'none',
        },
    });
}
