# Mission Control MCP Reference

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `MISSION_CONTROL_API_URL` | `http://10.10.50.6/api` | Production API (from kanban_dashboard `.env`) |
| `MISSION_CONTROL_API_TOKEN` | from `AUTH_API_TOKEN` | Required when JWT auth is enabled |

MCP entry: `/home/claude/claude_project/kanban_dashboard/mcp/run.sh`

## Memory Project

- **ID:** `b1a559b7-2aab-42d6-b450-9d8800842645`
- **Dashboard:** http://10.10.50.6/

## MCP Tools

### health_check
No parameters. Returns API and database status.

### get_overview
Returns `{ metrics, projects, upcoming, activity }`.

### get_status_report
No parameters. Returns markdown coordination report.

### list_projects
Returns array of `{ id, name, description, color, ... }`.

### get_board
- `project_id` (uuid)

Returns `{ project, board, columns: [{ ..., tasks: [...] }] }`.

### create_project
- `name` (required)
- `description`, `color` (optional)

### create_task
- `project_id`, `column_name`, `title` (required)
- `description`, `priority`, `assignee`, `due_date` (optional)

### update_task
- `task_id` (required)
- any task fields to change

### move_task
- `project_id`, `task_id`, `column_name` (required)
- `position` (optional, default: end of column)

### complete_task
- `project_id`, `task_id` → moves to Done

### delete_task
- `task_id`

## Setup in Cursor

1. `.cursor/mcp.json` in Memory_Project repo root.
2. MCP deps: `npm install --prefix /home/claude/claude_project/kanban_dashboard/mcp`
3. Restart Cursor to load MCP servers.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP tools fail | Run `health_check`; verify http://10.10.50.6/api/health |
| Auth errors | Check `AUTH_API_TOKEN` in kanban_dashboard `.env` |
| MCP not listed | Restart Cursor after editing `.cursor/mcp.json` |
