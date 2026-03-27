export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  stream?: boolean;
  onChunk?: (text: string) => void;
}

export interface Provider {
  chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions
  ): Promise<string>;
}
