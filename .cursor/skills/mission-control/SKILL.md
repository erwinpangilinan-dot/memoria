---
name: mission-control
description: >-
  Coordinate project status via the Mission Control Dashboard MCP server.
  Queries overview metrics, Kanban boards, tasks, and activity; creates or moves
  tasks; generates standup reports. Use when the user asks about project status,
  sprint progress, standups, task coordination, Mission Control, kanban board
  updates, overdue tasks, or what is in progress across projects.
---

# Mission Control Coordination

Use the **mission-control** MCP server to read and update the team's Mission Control Dashboard.

## This workspace

| Field | Value |
|-------|-------|
| **Project name** | Memory Project |
| **Project ID** | `b1a559b7-2aab-42d6-b450-9d8800842645` |
| **Dashboard** | http://10.10.50.6/ |
| **GitHub** | https://github.com/erwinpangilinan-dot/memoria |
| **API** | http://10.10.50.6/api (via kanban_dashboard `.env`) |

When creating or moving tasks for this repo, use the project ID above (or `list_projects` to verify).

After meaningful progress, update the board: move tasks between columns, add subtasks if needed.

## Prerequisites

1. Mission Control production: http://10.10.50.6/
2. MCP configured in `.cursor/mcp.json` → `kanban_dashboard/mcp/run.sh`
3. Auth token loaded from `kanban_dashboard/.env` (`AUTH_API_TOKEN`)

Always call `health_check` first if unsure the stack is up.

## Domain Rules

| Term | Meaning |
|------|---------|
| **Backlog** | Columns: Backlog + To Do |
| **In Progress** | Column: In Progress |
| **Completed** | Columns: Review + Done |
| **Overdue** | Past due date, not in Review/Done |

Default columns per project: `Backlog` → `To Do` → `In Progress` → `Review` → `Done`.

## Coordination Workflows

### Status check / standup

```
1. health_check
2. get_status_report          ← markdown summary for humans
   OR get_overview             ← raw JSON for analysis
3. get_board(project_id) for Memory Project detail
```

### Create work item

```
1. list_projects              ← verify project_id if needed
2. create_task
   - project_id: b1a559b7-2aab-42d6-b450-9d8800842645
   - column_name (e.g. "Backlog" or "To Do")
   - title, priority, assignee, due_date
```

### Mark work complete

```
complete_task(project_id, task_id)
```

Or `move_task` to `Review` or `Done`.

## Tool Quick Reference

| Tool | When to use |
|------|-------------|
| `health_check` | Verify API before other calls |
| `get_status_report` | Standups, status updates to user |
| `get_overview` | Metrics + widgets + activity (JSON) |
| `list_projects` | Find project IDs and names |
| `get_board` | Full Kanban for one project |
| `create_task` | Add task by column name |
| `move_task` | Change column / workflow stage |
| `complete_task` | Shortcut → Done |
| `update_task` | Edit title, priority, assignee, due date |

## Do Not

- Guess `project_id` or `task_id` — fetch via `list_projects` / `get_board` first.
- Use column UUIDs with the user — always refer to column **names**.

## Additional Resources

- MCP tool schemas: [reference.md](reference.md)
- Dashboard UI: http://10.10.50.6/
