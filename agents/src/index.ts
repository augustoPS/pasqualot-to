import { Team } from './team.js';

// Example usage — replace with your actual task
const team = new Team();

console.log('Team members:', team.list());

// Ask a single agent
// const response = await team.ask('director', 'What should we focus on today?', { stream: true });

// Run a pipeline: researcher → creator → critic → synthesizer
// const results = await team.pipeline('Explore the future of personal photography websites', [
//   'researcher',
//   'creator',
//   'critic',
//   'synthesizer',
// ]);
// results.forEach(r => console.log(`\n[${r.agent}]\n${r.content}`));

// Agents can remember things
// team.get('researcher').remember('project-focus', 'photography portfolio for pasqualot.to');
// team.get('researcher').shareMemory('site-url', 'pasqualot.to');
