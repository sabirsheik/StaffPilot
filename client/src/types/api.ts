import type { Role } from '../constants/roles';

export interface TeamInfo {
  teamName?: string;
  department?: string;
  projectFocus?: string;
}

export interface UserRecord {
  _id: string;
  id?: string;
  fullName: string;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  teamLead?: string | UserRecord | null;
  teamInfo?: TeamInfo | null;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
}

export interface NotificationRecord {
  _id: string;
  recipient: string;
  actor?: string | null;
  actorName?: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: T[];
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserRecord;
  error?: string;
}

export interface NotificationCountResponse {
  success: boolean;
  data: { unreadCount: number };
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;
export type UnknownRecord = Record<string, unknown>;