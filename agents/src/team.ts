import { Agent } from './agent.js';
import { teamConfig } from './team.config.js';
import type { AgentResponse } from './types.js';

export class Team {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    for (const config of teamConfig.agents) {
      this.agents.set(config.name, new Agent(config));
    }
  }

  get(name: string): Agent {
    const agent = this.agents.get(name);
    if (!agent) throw new Error(`Agent "${name}" not found. Available: ${this.list().join(', ')}`);
    return agent;
  }

  list(): string[] {
    return Array.from(this.agents.keys());
  }

  // Ask a single agent
  async ask(agentName: string, message: string, options: { stream?: boolean } = {}): Promise<AgentResponse> {
    return this.get(agentName).chat(message, options);
  }

  // Broadcast to all agents and collect responses
  async broadcast(message: string): Promise<AgentResponse[]> {
    return Promise.all(
      [...this.agents.values()].map(agent => agent.chat(message))
    );
  }

  // Round-table: each agent responds to the previous agent's output
  async roundTable(initialMessage: string, agentOrder?: string[]): Promise<AgentResponse[]> {
    const order = agentOrder ?? this.list();
    const responses: AgentResponse[] = [];
    let currentMessage = initialMessage;

    for (const name of order) {
      const response = await this.ask(name, currentMessage);
      responses.push(response);
      currentMessage = `${name} said:\n${response.content}\n\nYour turn:`;
    }

    return responses;
  }

  // Pipeline: output of each agent feeds into the next
  async pipeline(task: string, agentOrder: string[]): Promise<AgentResponse[]> {
    const responses: AgentResponse[] = [];
    let input = task;

    for (const name of agentOrder) {
      const response = await this.ask(name, input);
      responses.push(response);
      input = response.content;
    }

    return responses;
  }

  clearAllHistories(): void {
    this.agents.forEach(agent => agent.clearHistory());
  }
}
