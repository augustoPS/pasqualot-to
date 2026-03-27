export interface MemoryEntry {
  key: string;
  value: string;
  tags: string[];
  timestamp: string;
  author: string; // agent name or 'shared'
}

export interface MemoryStore {
  entries: MemoryEntry[];
}

export interface AgentConfig {
  name: string;
  role: string;
  personality: string;       // character description
  priorities: string[];      // ordered list of what this agent cares about most
  systemPrompt: string;      // full system prompt (configure later)
  model?: string;            // defaults to claude-opus-4-6
  temperature?: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  agent: string;
  content: string;
  usedMemory: MemoryEntry[];
}

export interface TeamConfig {
  agents: AgentConfig[];
  sharedContext: string;     // context all agents share (configure later)
}
