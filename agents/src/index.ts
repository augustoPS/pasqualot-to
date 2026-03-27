import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Team } from './team.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

function readFile(relPath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf-8');
}

function section(label: string, content: string): string {
  if (!content.trim()) return '';
  return `\n### ${label}\n\`\`\`\n${content.trim()}\n\`\`\`\n`;
}

const projectContext = [
  section('package.json', readFile('package.json')),
  section('astro.config.mjs', readFile('astro.config.mjs')),
  section('src/config.ts', readFile('src/config.ts')),
  section('src/content.config.ts', readFile('src/content.config.ts')),
  section('src/styles/global.css', readFile('src/styles/global.css')),
  section('src/layouts/BaseLayout.astro', readFile('src/layouts/BaseLayout.astro')),
  section('src/components/Nav.astro', readFile('src/components/Nav.astro')),
  section('src/pages/index.astro', readFile('src/pages/index.astro')),
  section('src/pages/gallery/[slug].astro', readFile('src/pages/gallery/[slug].astro')),
  section('src/pages/about.astro', readFile('src/pages/about.astro')),
  section('src/pages/notes/index.astro', readFile('src/pages/notes/index.astro')),
  section('src/pages/projects/index.astro', readFile('src/pages/projects/index.astro')),
  section('src/pages/blog/index.astro', readFile('src/pages/blog/index.astro')),
  section('CLAUDE.md', readFile('CLAUDE.md')),
].join('');

const basePrompt = `You are reviewing the source code of pasqualot.to — a personal photography portfolio and projects website built with Astro 6 + Tailwind CSS v4. It is a static site deployed on Vercel.

Here are the key project files:
${projectContext}

Provide your analysis from your specific role and perspective. Be concrete and specific — reference actual files and line numbers where relevant. Flag what is good, what is missing, and what should be improved.`;

const team = new Team();

const pipeline: Array<{ agent: string; focus: string }> = [
  { agent: 'researcher',          focus: 'Understand and map the project architecture. What is this site doing, how is it structured, and what are the key patterns and dependencies?' },
  { agent: 'developer_frontend',  focus: 'Review the UI implementation. Assess component structure, Tailwind usage, accessibility, responsiveness, and performance considerations.' },
  { agent: 'developer_backend',   focus: 'Review the data layer. Assess the content collections schema, the album/blog/notes/projects models, and how data flows through the site.' },
  { agent: 'developer_devops',    focus: 'Review the build and deployment setup. Assess the Astro config, static output, Vercel deployment, and what is missing for production readiness.' },
  { agent: 'security',            focus: 'Review the site for security concerns. Pay particular attention to the client-side password gate on album pages.' },
  { agent: 'tester',              focus: 'Identify what is untested and what should be. What are the highest-risk user flows and edge cases that need coverage?' },
  { agent: 'critic',              focus: 'Give an honest overall critique. What are the biggest weaknesses in the project as it stands?' },
  { agent: 'synthesizer',         focus: 'Synthesize all previous analysis into a prioritised list of findings: what is solid, what needs attention soon, and what should be addressed before launch.' },
];

console.log('pasqualot.to — Team Analysis\n' + '='.repeat(40) + '\n');

for (const { agent, focus } of pipeline) {
  console.log(`\n[${'='.repeat(36)}]`);
  console.log(`[ ${agent.toUpperCase().padEnd(34)} ]`);
  console.log(`[${'='.repeat(36)}]\n`);

  const prompt = `${basePrompt}\n\nYour specific focus for this review:\n${focus}`;
  const response = await team.ask(agent, prompt, { stream: true });

  // Save full findings to shared memory
  team.get(agent).shareMemory(
    `analysis:${agent}`,
    response.content,
    ['analysis', 'pasqualot.to']
  );
}

console.log('\n' + '='.repeat(40));
console.log('Analysis complete. Findings saved to shared memory.');
