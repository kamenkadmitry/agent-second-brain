import { logger } from '../utils/logger.js';
import { env } from 'process';

export interface TodoistTaskOptions {
  content: string;
  description?: string;
  dueString?: string;
  priority?: number; // 1 (normal) to 4 (urgent) in API, but usually 1 is lowest
  labels?: string[];
}

export class TodoistService {
  private apiKey: string;
  private baseUrl = 'https://api.todoist.com/rest/v2';

  constructor() {
    const key = env.TODOIST_API_KEY;
    if (!key) {
      logger.error('TODOIST_API_KEY is not set');
      throw new Error('TODOIST_API_KEY is required but missing from environment variables');
    }
    this.apiKey = key;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('Content-Type', 'application/json');

    logger.debug({ method: options.method || 'GET', url }, 'Todoist API request');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Failed to read error response');
      logger.error({ status: response.status, error: errText, endpoint }, 'Todoist API error');
      throw new Error(`Todoist API failed: ${response.status} ${response.statusText}`);
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as any;
    }

    return response.json();
  }

  async createTask(options: TodoistTaskOptions): Promise<any> {
    logger.info({ task: options.content }, 'Creating Todoist task');

    // Todoist API expects due_string
    const payload: any = {
      content: options.content,
      description: options.description,
      priority: options.priority,
      labels: options.labels,
    };

    if (options.dueString) {
      payload.due_string = options.dueString;
    }

    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTasks(params?: { filter?: string; label?: string }): Promise<any[]> {
    logger.info({ params }, 'Fetching Todoist tasks');

    const urlParams = new URLSearchParams();
    if (params?.filter) urlParams.append('filter', params.filter);
    if (params?.label) urlParams.append('label', params.label);

    const queryString = urlParams.toString();
    const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';

    return this.request<any[]>(endpoint);
  }
}

// We'll export a factory or instance later, but it needs env vars, so we must be careful about initialization
export const createTodoistService = () => new TodoistService();
