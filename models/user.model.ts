export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
}

export interface UserRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export const toUser = (record: UserRecord): User => ({
  id: record.id,
  firstName: record.first_name,
  lastName: record.last_name,
  email: record.email,
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
});
