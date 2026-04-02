export type MemberRole = "admin" | "contributor";
export type TaskStatus = "new" | "active" | "staging" | "deployed";
export type TaskPriority = "low" | "medium" | "high" | "blocked";

export type Profile = {
  uid: string;
  name: string;
  email: string;
  lowercaseEmail?: string;
  createdAt?: unknown;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  adminIds: string[];
  memberIds: string[];
  createdAt?: unknown;
};

export type Member = {
  uid: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt?: unknown;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  labels?: string[];
  createdBy: string;
  createdByName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
