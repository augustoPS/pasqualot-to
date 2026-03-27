import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { stream } from 'hono/streaming';
import { Team } from '../team.js';
import { teamConfig } from '../team.config.js';

const app = new Hono();
const team = new Team();

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/public/*', serveStatic({ root: './src/dashboard' }));
app.get('/', serveStatic({ path: './src/dashboard/public/index.html' }));

// ── Agents list ───────────────────────────────────────────────────────────────
app.get('/agents', (c) => {
  const agents = teamConfig.agents.map(a => ({
    name: a.name,
    role: a.role,
    personality: a.personality,
    priorities: a.priorities,
  }));
  return c.json(agents);
});

// ── Individual chat (streaming) ───────────────────────────────────────────────
app.post('/chat/:agent', async (c) => {
  const agentName = c.req.param('agent');
  const { message } = await c.req.json<{ message: string }>();

  return stream(c, async (s) => {
    try {
      team.get(agentName); // validate agent exists
    } catch {
      await s.write(JSON.stringify({ error: `Agent "${agentName}" not found` }) + '\n');
      return;
    }

    await team.ask(agentName, message, {
      stream: true,
      onChunk: async (delta) => {
        await s.write(delta);
      },
    });
  });
});

// ── Group chat — runs agents in parallel, streams tagged NDJSON ───────────────
app.post('/group', async (c) => {
  const { message, agents: selectedAgents } = await c.req.json<{
    message: string;
    agents?: string[];
  }>();

  const targetAgents = selectedAgents ?? team.list();

  return stream(c, async (s) => {
    await Promise.all(
      targetAgents.map(async (name) => {
        try {
          await team.ask(name, message, {
            stream: true,
            onChunk: async (delta) => {
              await s.write(JSON.stringify({ agent: name, chunk: delta }) + '\n');
            },
          });
          await s.write(JSON.stringify({ agent: name, done: true }) + '\n');
        } catch (err) {
          await s.write(JSON.stringify({ agent: name, error: String(err) }) + '\n');
        }
      })
    );
  });
});

// ── Memory ────────────────────────────────────────────────────────────────────
app.get('/memory/:agent', (c) => {
  const agentName = c.req.param('agent');
  const entries = agentName === 'shared'
    ? team.get(team.list()[0]).recallShared()
    : team.get(agentName).recall();
  return c.json(entries);
});

app.delete('/history/:agent', (c) => {
  const agentName = c.req.param('agent');
  if (agentName === 'all') {
    team.clearAllHistories();
  } else {
    team.get(agentName).clearHistory();
  }
  return c.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 4242;
serve({ fetch: app.fetch, port: PORT });
console.log(`\nAgent dashboard running at http://localhost:${PORT}\n`);
