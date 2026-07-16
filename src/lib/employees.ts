// ============================================================
// HyperExcellence - Gestion des employes (cote app React)
// Creation via Appwrite Function securisee, lecture/modification directe.
// ============================================================
import { Client, Functions, Query } from 'appwrite';
import { databases, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, UserRole } from '../constants';

const CREATE_EMPLOYEE_FUNCTION_ID = '6a55f8300015cb446152';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const functions = new Functions(client);

export interface Profile {
  $id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  sector: string | null;
  badge_number: string | null;
  is_active: boolean;
}

export interface CreateEmployeeInput {
  badgeNumber: string;
  pin: string;
  fullName: string;
  role: UserRole;
  departmentId?: string;
  sector?: string;
}

export async function createEmployee(input: CreateEmployeeInput) {
  const execution = await functions.createExecution(
    CREATE_EMPLOYEE_FUNCTION_ID,
    JSON.stringify(input),
    false
  );

  const result = JSON.parse(execution.responseBody);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

export async function listEmployees(): Promise<Profile[]> {
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.orderDesc('$createdAt'), Query.limit(100)]
  );
  return result.documents as unknown as Profile[];
}

export interface UpdateEmployeeInput {
  fullName?: string;
  role?: UserRole;
  departmentId?: string | null;
  sector?: string | null;
  isActive?: boolean;
}

export async function updateEmployee(profileId: string, input: UpdateEmployeeInput) {
  const payload: Record<string, unknown> = {};
  if (input.fullName !== undefined) payload.full_name = input.fullName;
  if (input.role !== undefined) payload.role = input.role;
  if (input.departmentId !== undefined) payload.department_id = input.departmentId || null;
  if (input.sector !== undefined) payload.sector = input.sector || null;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  return databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.PROFILES,
    profileId,
    payload
  );
}

export async function deactivateEmployee(profileId: string) {
  return updateEmployee(profileId, { isActive: false });
}

export async function reactivateEmployee(profileId: string) {
  return updateEmployee(profileId, { isActive: true });
}
