import type { Provider, ChatMessage, ChatOptions } from './types.js';

const OLLAMA_BASE = 'http://localhost:11434';

export class OllamaProvider implements Provider {
  private model: string;

  constructor(model = 'llama3.1:8b') {
    this.model = model;
  }

  async chat(messages: ChatMessage[], systemPrompt: string, options: ChatOptions = {}): Promise<string> {
    const body = JSON.stringify({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: options.stream ?? false,
    });

    const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
    }

    if (!options.stream) {
      const data = await response.json() as { message: { content: string } };
      return data.message.content;
    }

    // Streaming via NDJSON
    let text = '';
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
          const delta = chunk.message?.content ?? '';
          if (delta) {
            text += delta;
            options.onChunk?.(delta);
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    return text;
  }
}
