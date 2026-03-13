import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { subscribeToChatSessionEvents } from '@/lib/chat-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function encodeSseMessage(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = (session.user as any).id;
  const chatSession = await prisma.chatSession.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!chatSession) {
    return new Response('Not Found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSseMessage(event, data)));
      };

      send('ready', { sessionId: params.id });

      const unsubscribe = subscribeToChatSessionEvents(params.id, (event) => {
        send(event.type, event);
      });

      const heartbeatId = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 15000);

      const close = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(heartbeatId);
        unsubscribe();
        controller.close();
      };

      req.signal.addEventListener('abort', close);
    },
    cancel() {
      // Cleanup is driven by req.signal abort on client disconnect.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
