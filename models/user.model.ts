export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  lastActivityAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UserRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  last_activity_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const toUser = (record: UserRecord): User => ({
  id: record.id,
  firstName: record.first_name,
  lastName: record.last_name,
  email: record.email,
  password: record.password,
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
  lastActivityAt: record.last_activity_at
    ? new Date(record.last_activity_at)
    : null,
});
