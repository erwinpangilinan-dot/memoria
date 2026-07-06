#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../kanban_dashboard/.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    })
);

const BASE = (process.env.MISSION_CONTROL_API_URL || env.MISSION_CONTROL_API_URL || 'http://10.10.50.6/api').replace(/\/$/, '');
const TOKEN = process.env.MISSION_CONTROL_API_TOKEN || env.AUTH_API_TOKEN;
const REPO = 'erwinpangilinan-dot/memoria';
const PROJECT_ID = 'b1a559b7-2aab-42d6-b450-9d8800842645';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} on ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const tasks = [
  { id: '2297dc5f-ab71-4784-9bdf-75d113374bc4', title: 'Project setup & Mission Control tracking', body: 'Register on Mission Control, wire MCP + skills in Memory_Project workspace.', closed: true },
  { id: '792814bf-9a4e-4035-bb89-b0c3f1b3d824', title: 'Phase 1: MCP skeleton', body: 'memoria MCP with memoria_remember, memoria_recall, memoria_status. SQLite + markdown vault sync.', closed: true },
  { id: '2d61d0a0-b860-4bed-a596-46d35daf385f', title: 'Phase 2: Human-like memory', body: 'Salience gate, episodic vs semantic types, entity extraction, multi-signal recall.', closed: false },
  { id: '321705b7-de74-466d-88f3-8629f151df5d', title: 'Phase 3: memoria skill', body: 'Cursor/Claude skill for memoria_recall/remember workflows and MCP config examples.', closed: false },
  { id: 'd1a51b44-913a-4747-89aa-c48a5c64f90f', title: 'Phase 4: Memoria UX', body: 'Memoria vault UX: wikilinks + graph, daily notes, .memoriaignore, conversation logging hooks.', closed: false },
  { id: 'f06365fe-419d-454c-89d3-f9ad5cc6688e', title: 'Research & architecture doc', body: 'Document CLS-inspired architecture (episodic + semantic + consolidation).', closed: false },
];

for (const t of tasks) {
  await api(`/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ github_issue_url: null }) });
  const body = `${t.body}\n\nTracked in Mission Control: http://10.10.50.6/`;
  const url = execSync(
    `gh issue create --repo ${REPO} --title ${JSON.stringify(t.title)} --body ${JSON.stringify(body)}`,
    { encoding: 'utf8' }
  ).trim();
  if (t.closed) {
    const num = url.match(/issues\/(\d+)/)[1];
    execSync(`gh issue close ${num} --repo ${REPO}`, { stdio: 'inherit' });
  }
  const linked = await api(`/tasks/${t.id}`, {
    method: 'PUT',
    body: JSON.stringify({ github_issue_url: url }),
  });
  console.log(`${linked.title} -> ${linked.github_issue_url}`);
}

await api(`/projects/${PROJECT_ID}`, {
  method: 'PUT',
  body: JSON.stringify({
    description: 'Memoria — human-like selective memory. Repo: https://github.com/erwinpangilinan-dot/memoria',
  }),
});
console.log('Project description updated');
