import Anthropic from '@anthropic-ai/sdk';
import type { AgentConfig, Message, AgentResponse, MemoryEntry } from './types.js';
import {
  readMemory,
  writeMemory,
  searchMemory,
  formatMemoriesForPrompt,
} from './memory/store.js';

const client = new Anthropic();

export class Agent {
  readonly config: AgentConfig;
  private history: Message[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  // Individual memory
  remember(key: string, value: string, tags: string[] = []): void {
    writeMemory({ key, value, tags, author: this.name }, this.name);
  }

  // Shared team memory
  shareMemory(key: string, value: string, tags: string[] = []): void {
    writeMemory({ key, value, tags, author: this.name });
  }

  recall(query?: string): MemoryEntry[] {
    return query ? searchMemory(query, this.name) : readMemory(this.name);
  }

  recallShared(query?: string): MemoryEntry[] {
    return query ? searchMemory(query) : readMemory();
  }

  clearHistory(): void {
    this.history = [];
  }

  async chat(userMessage: string, options: { stream?: boolean } = {}): Promise<AgentResponse> {
    const myMemory = readMemory(this.name);
    const sharedMemory = readMemory();

    const systemPrompt = [
      this.config.systemPrompt,
      '',
      `--- Your Memory ---`,
      formatMemoriesForPrompt(myMemory),
      '',
      `--- Shared Team Memory ---`,
      formatMemoriesForPrompt(sharedMemory),
    ].join('\n');

    this.history.push({ role: 'user', content: userMessage });

    const messages = this.history.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const model = this.config.model ?? 'claude-opus-4-6';

    let responseText = '';

    if (options.stream) {
      const stream = client.messages.stream({
        model,
        max_tokens: 64000,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages,
      });

      stream.on('text', (delta) => {
        process.stdout.write(delta);
        responseText += delta;
      });

      await stream.finalMessage();
      process.stdout.write('\n');
    } else {
      const response = await client.messages.create({
        model,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages,
      });

      for (const block of response.content) {
        if (block.type === 'text') responseText += block.text;
      }
    }

    this.history.push({ role: 'assistant', content: responseText });

    return {
      agent: this.name,
      content: responseText,
      usedMemory: [...myMemory, ...sharedMemory],
    };
  }
}
