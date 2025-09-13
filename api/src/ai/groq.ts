const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
const key = process.env.GROQ_API_KEY

export async function runGroq(context: string): Promise<{ summary: string, tags: string[], pitch: string }> {
  if (!key) {
    // Modo mock para desenvolvimento
    return {
      summary: 'Discussão sobre novas features e ideias para o PitchLab.',
      tags: ['ideação', 'produto', 'MVP'],
      pitch: 'PitchLab é uma sala colaborativa de ideação com chat em tempo real, geração de ideias e IA que resume, classifica e propõe um pitch conciso a partir da conversa.'
    }
  }
  // Chamada simplificada ao endpoint de chat do Groq (ajuste conforme SDK/endpoint real)
  const prompt = `Resuma o diálogo abaixo em 3-5 frases; depois gere 3-5 tags curtas; por fim escreva um pitch curto e estruturado. Formato JSON:
{"summary":"...", "tags":["..."], "pitch":"..."}
---
${context}`

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Você é um assistente que retorna JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    })
  })
  const j = await r.json()
  const content = j.choices?.[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(content)
    return { summary: parsed.summary, tags: parsed.tags, pitch: parsed.pitch }
  } catch {
    return {
      summary: 'Resumo indisponível.',
      tags: ['tag1', 'tag2', 'tag3'],
      pitch: 'Pitch indisponível.'
    }
  }
}
