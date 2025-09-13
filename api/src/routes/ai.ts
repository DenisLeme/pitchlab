// ai.ts
import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { prisma } from '../index.js';
import { runGroq } from '../ai/groq.js';
import type { Server } from 'socket.io';
import { getIO } from '../sockets/handlers.js';

export const aiLimiter = rateLimit({ windowMs: 60_000, max: 15 });

type AIMode = 'summary_all' | 'tags_only' | 'pitch_only';

// ---------------- Helpers ----------------

function buildContext(
  messages: { role: 'user' | 'assistant'; content: string; createdAt: Date }[],
) {
  const assistantClean = messages.filter(
    (m) =>
      m.role === 'assistant' &&
      !/^resumo:/i.test(m.content.trim()) &&
      !/^pitch:/i.test(m.content.trim()) &&
      !/^tags sugeridas:/i.test(m.content.trim()),
  );
  const userMsgs = messages.filter((m) => m.role === 'user');
  const pick = <T,>(arr: T[], n: number) => arr.slice(-n);

  const selected = [...pick(userMsgs, 12), ...pick(assistantClean, 6)].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return selected
    .map((m) => (m.role === 'assistant' ? `ASSISTENTE: ${m.content}` : `USUÁRIO: ${m.content}`))
    .join('\n');
}

async function getRoomTagsWithCount(roomId: string) {
  const tags = await prisma.tag.findMany({
    where: { messages: { some: { message: { roomId } } } },
    orderBy: { name: 'asc' },
  });
  const counts = await prisma.messageTag.groupBy({
    by: ['tagId'],
    where: { message: { roomId } },
    _count: { tagId: true },
  });
  return tags.map((t) => ({
    ...t,
    count: counts.find((c) => c.tagId === t.id)?._count.tagId ?? 0,
  }));
}

// --------------- Núcleo (agora com modo) ---------------

export async function maybeRunAI(roomId: string, mode: AIMode = 'summary_all') {
  const io: Server = getIO();

  // Carrega histórico completo da sala (ordem crescente ajuda no contexto)
  const raw = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
  });

  const lastUser = [...raw].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    console.log('[AI] nenhum lastUser — escreva algo no chat antes.');
  }

  const text = buildContext(raw);
  const { summary, tags, pitch } = await runGroq(text);
  console.log('[AI]', mode, 'retorno:', { summary, tags, pitch });

  // --- Tags: criar/vincular apenas quando o modo pede tags ---
  const shouldHandleTags = mode === 'summary_all' || mode === 'tags_only';
  const createdTagNames: string[] = [];

  if (shouldHandleTags && Array.isArray(tags) && tags.length > 0 && lastUser) {
    for (const t of tags) {
      const name = String(t).toLowerCase().trim();
      if (!name) continue;

      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });

      await prisma.messageTag.upsert({
        where: { messageId_tagId: { messageId: lastUser.id, tagId: tag.id } },
        update: {},
        create: { messageId: lastUser.id, tagId: tag.id },
      });

      createdTagNames.push(name);
    }
  }

  // --- Mensagens do assistente conforme o modo ---
  const assistantMsgs: { content: string }[] = [];

  const notFallbackSummary = summary && summary !== 'Resumo indisponível.';
  const notFallbackPitch = pitch && pitch !== 'Pitch indisponível.';
  const hasTags = Array.isArray(tags) && tags.length > 0;

  if (mode === 'summary_all') {
    if (notFallbackSummary) assistantMsgs.push({ content: `Resumo:\n${summary}` });
    if (hasTags) assistantMsgs.push({ content: `Tags sugeridas: ${tags.join(', ')}` });
    if (notFallbackPitch) assistantMsgs.push({ content: `Pitch:\n${pitch}` });
  } else if (mode === 'tags_only') {
    if (hasTags) assistantMsgs.push({ content: `Tags sugeridas: ${tags.join(', ')}` });
  } else if (mode === 'pitch_only') {
    if (notFallbackPitch) assistantMsgs.push({ content: `Pitch:\n${pitch}` });
  }

  for (const m of assistantMsgs) {
    const created = await prisma.message.create({
      data: { content: m.content, role: 'assistant', roomId },
    });
    io.to(roomId).emit('new_summary', created);
  }

  // --- Atualiza painel de tags quando mexemos em tags ---
  if (shouldHandleTags && createdTagNames.length > 0) {
    const roomTags = await getRoomTagsWithCount(roomId);
    io.to(roomId).emit('tags_updated', roomTags);
    console.log('[AI] tags criadas/vinculadas:', createdTagNames);
  } else if (mode !== 'pitch_only' && !createdTagNames.length) {
    console.log('[AI] nenhuma tag criada (vazio ou sem lastUser).');
  }
}

// ---------------- Rotas ----------------

const router = Router();

router.post('/summary', aiLimiter, async (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  await maybeRunAI(roomId, 'summary_all'); // Resumo IA → tudo
  res.json({ ok: true });
});

router.post('/tags', aiLimiter, async (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  await maybeRunAI(roomId, 'tags_only'); // Tags IA → só tags
  res.json({ ok: true });
});

router.post('/pitch', aiLimiter, async (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  await maybeRunAI(roomId, 'pitch_only'); // Pitch IA → só pitch
  res.json({ ok: true });
});

// carregar tags do room (para o painel)
router.get('/rooms/:roomId/tags', async (req, res) => {
  const { roomId } = req.params;
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  try {
    const tags = await getRoomTagsWithCount(roomId);
    res.json(tags);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar tags' });
  }
});

export default router;
