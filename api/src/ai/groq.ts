// groq.ts
// Requer: GROQ_API_KEY (e opcional GROQ_MODEL) no .env do serviço da API.

const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const key = process.env.GROQ_API_KEY;

export type GroqResult = { summary: string; tags: string[]; pitch: string };

export async function runGroq(context: string): Promise<GroqResult> {
  // Modo mock para desenvolvimento local sem chave
  if (!key) {
    return {
      summary: 'Discussão sobre novas features e ideias para o PitchLab.',
      tags: ['ideação', 'produto', 'MVP'],
      pitch:
        'PitchLab é uma sala colaborativa de ideação com chat em tempo real, geração de ideias e IA que resume, classifica e propõe um pitch conciso a partir da conversa.',
    };
  }

  const prompt = [
    'Resuma o diálogo abaixo em 3–5 frases.',
    'Depois gere de 3–5 tags curtas (1–2 palavras, em minúsculas).',
    'Por fim, escreva um pitch curto (2–3 frases).',
    'Responda APENAS com um JSON válido, sem markdown, sem comentários, um único objeto.',
    'Formato exato: {"summary":"...", "tags":["..."], "pitch":"..."}',
    '---',
    context || '(sem contexto)',
  ].join('\n');

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente que responde SOMENTE com JSON válido (um único objeto).',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      // Força o retorno em JSON puro (modo compatível OpenAI)
      response_format: { type: 'json_object' },
      max_tokens: 500,
    }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    console.error('Groq HTTP error', r.status, txt);
    return {
      summary: 'Resumo indisponível.',
      tags: ['tag1', 'tag2', 'tag3'],
      pitch: 'Pitch indisponível.',
    };
  }

  const j = await r.json().catch((e) => {
    console.error('Groq JSON error', e);
    return null;
  });

  const content: string = j?.choices?.[0]?.message?.content ?? '';

  // Tentativa 1: parse direto (deve funcionar com response_format json_object)
  try {
    const parsed = JSON.parse(content);
    const summary =
      typeof parsed.summary === 'string' ? parsed.summary : 'Resumo indisponível.';
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
      : ['tag1', 'tag2', 'tag3'];
    const pitch = typeof parsed.pitch === 'string' ? parsed.pitch : 'Pitch indisponível.';
    return { summary, tags, pitch };
  } catch {
    // Tentativa 2: limpar possíveis blocos ```json (raro, mas defensivo)
    try {
      const cleaned = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const summary =
        typeof parsed.summary === 'string' ? parsed.summary : 'Resumo indisponível.';
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
        : ['tag1', 'tag2', 'tag3'];
      const pitch =
        typeof parsed.pitch === 'string' ? parsed.pitch : 'Pitch indisponível.';
      return { summary, tags, pitch };
    } catch {
      console.error('Groq content not JSON:', content);
      return {
        summary: 'Resumo indisponível.',
        tags: ['tag1', 'tag2', 'tag3'],
        pitch: 'Pitch indisponível.',
      };
    }
  }
}
