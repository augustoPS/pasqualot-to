import type { AgentConfig, Message, AgentResponse, MemoryEntry } from './types.js';
import { createProvider } from './providers/index.js';
import type { Provider } from './providers/index.js';
import {
  readMemory,
  writeMemory,
  searchMemory,
  formatMemoriesForPrompt,
} from './memory/store.js';

export class Agent {
  readonly config: AgentConfig;
  private history: Message[] = [];
  private provider: Provider;

  constructor(config: AgentConfig) {
    this.config = config;
    this.provider = createProvider();
  }

  get name(): string {
    return this.config.name;
  }

  remember(key: string, value: string, tags: string[] = []): void {
    writeMemory({ key, value, tags, author: this.name }, this.name);
  }

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

    const responseText = await this.provider.chat(
      this.history,
      systemPrompt,
      {
        stream: options.stream,
        onChunk: options.stream ? (delta) => process.stdout.write(delta) : undefined,
      }
    );

    if (options.stream) process.stdout.write('\n');

    this.history.push({ role: 'assistant', content: responseText });

    return {
      agent: this.name,
      content: responseText,
      usedMemory: [...myMemory, ...sharedMemory],
    };
  }
}
