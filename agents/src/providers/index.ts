import { OllamaProvider } from './ollama.js';
import { AnthropicProvider } from './anthropic.js';
import type { Provider } from './types.js';

// Switch provider here — one line change
export function createProvider(): Provider {
  return new OllamaProvider('llama3.1:8b');
  // return new AnthropicProvider('claude-opus-4-6');
  // return new AnthropicProvider('claude-sonnet-4-6');
  // return new AnthropicProvider('claude-haiku-4-5');
}

export type { Provider };
