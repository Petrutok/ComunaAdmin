import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'department_head' | 'employee';

export interface Department {
  id: string;
  name: string;
  description: string;
  responsibleUserId: string | null;
  responsibleUserName?: string; // Populated from users collection
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  departmentName?: string; // Populated from departments collection
  active: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface DepartmentFormData {
  name: string;
  description: string;
  responsibleUserId: string | null;
}

export interface UserFormData {
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  active: boolean;
}
