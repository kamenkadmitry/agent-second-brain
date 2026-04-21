import { logger } from '../utils/logger.js';

export interface TodoistTaskInput {
  content: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  dueString?: string;
}

export async function createTodoistTask(apiKey: string, task: TodoistTaskInput): Promise<unknown> {
  if (!apiKey) throw new Error('Todoist API key is not configured');

  const payload: Record<string, unknown> = {
    content: task.content,
    description: task.description,
    priority: task.priority,
  };
  if (task.dueString) payload.due_string = task.dueString;

  logger.info({ content: task.content }, 'Creating Todoist task');
  const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Todoist request failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}
