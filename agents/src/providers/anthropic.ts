import Anthropic from '@anthropic-ai/sdk';
import type { Provider, ChatMessage, ChatOptions } from './types.js';

const client = new Anthropic();

export class AnthropicProvider implements Provider {
  private model: string;

  constructor(model = 'claude-opus-4-6') {
    this.model = model;
  }

  async chat(messages: ChatMessage[], systemPrompt: string, options: ChatOptions = {}): Promise<string> {
    let text = '';

    if (options.stream) {
      const stream = client.messages.stream({
        model: this.model,
        max_tokens: 64000,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages,
      });

      stream.on('text', (delta) => {
        text += delta;
        options.onChunk?.(delta);
      });

      await stream.finalMessage();
    } else {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages,
      });

      for (const block of response.content) {
        if (block.type === 'text') text += block.text;
      }
    }

    return text;
  }
}
