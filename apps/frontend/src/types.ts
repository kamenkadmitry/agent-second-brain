export interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

export type EntryType = 'text' | 'voice' | 'image' | 'url' | 'forward';

export interface Entry {
  id: string;
  type: EntryType;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  tags: Tag[];
}

export type MemoryTier = 'Core' | 'Active' | 'Warm' | 'Cold' | 'Archive';

export interface Memory {
  id: string;
  content: string;
  summary?: string | null;
  tier: MemoryTier;
  decayScore: number;
  lastAccessed: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export type TaskStatus = 'pending' | 'completed' | 'archived';

export interface Task {
  id: string;
  content: string;
  isUrgent: boolean;
  isImportant: boolean;
  status: TaskStatus;
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface Skill {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface Settings {
  llmBaseUrl: string;
  llmApiKey: string | null;
  llmModelName: string;
  telegramToken: string | null;
  telegramChatId: string | null;
  deepgramApiKey: string | null;
  todoistApiKey: string | null;
}

export interface User {
  id: string;
  email: string;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  color?: string;
  group?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
  weight: number;
}
