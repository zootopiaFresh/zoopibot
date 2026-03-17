import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { ConversationEvent } from '@zootopiafresh/agent-core';
import { getMoonwaveEventHub, getMoonwaveRuntime } from './runtime';

const port = Number.parseInt(process.env.PORT || '4310', 10);

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>;
}

function writeSse(res: ServerResponse, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function getThreadId(pathname: string) {
  const messageMatch = pathname.match(/^\/threads\/([^/]+)\/messages$/);
  if (messageMatch) {
    return { threadId: decodeURIComponent(messageMatch[1]), type: 'messages' as const };
  }

  const eventMatch = pathname.match(/^\/threads\/([^/]+)\/events$/);
  if (eventMatch) {
    return { threadId: decodeURIComponent(eventMatch[1]), type: 'events' as const };
  }

  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const runtime = getMoonwaveRuntime();

  if (req.method === 'GET' && url.pathname === '/') {
    return json(res, 200, {
      name: 'moonwave-counselor',
      description: 'Conversation runtime SDK를 붙인 감정 지원 상담 토이 서버',
      warning: '응급 대응용 서비스가 아니며, 위기 상황에서는 전문 도움을 우선 이용해야 합니다.',
      routes: {
        createThread: { method: 'POST', path: '/threads' },
        sendMessage: { method: 'POST', path: '/threads/:threadId/messages' },
        listMessages: { method: 'GET', path: '/threads/:threadId/messages' },
        events: { method: 'GET', path: '/threads/:threadId/events' },
      },
    });
  }

  if (req.method === 'POST' && url.pathname === '/threads') {
    return json(res, 201, { threadId: randomUUID() });
  }

  const route = getThreadId(url.pathname);
  if (!route) {
    return json(res, 404, { error: 'not_found' });
  }

  if (route.type === 'messages' && req.method === 'GET') {
    const messages = await runtime.thread(route.threadId).history();
    return json(res, 200, { threadId: route.threadId, messages });
  }

  if (route.type === 'messages' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const input = typeof body.input === 'string' ? body.input.trim() : '';
    if (!input) {
      return json(res, 400, { error: 'input_required' });
    }

    const requirementSetId =
      typeof body.requirementSetId === 'string' ? body.requirementSetId : undefined;
    const ack = await runtime.thread(route.threadId).start({
      input,
      agentId: 'moonwave-counselor',
      requirementSetId,
      meta: {
        channel: 'http',
      },
    });

    return json(res, 201, {
      threadId: route.threadId,
      run: ack.run,
      userMessage: ack.inputMessage,
      assistantMessage: ack.outputMessage,
    });
  }

  if (route.type === 'events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const unsubscribe = getMoonwaveEventHub().subscribe(route.threadId, (event: ConversationEvent) => {
      writeSse(res, event.type, event);
    });

    writeSse(res, 'ready', { threadId: route.threadId });
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(ping);
      unsubscribe();
      res.end();
    });
    return;
  }

  return json(res, 405, { error: 'method_not_allowed' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[MoonwaveCounselor] listening on http://127.0.0.1:${port}`);
});
