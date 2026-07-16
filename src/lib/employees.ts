// ============================================================
// HyperExcellence - Gestion des employes (cote app React)
// Creation ET modification via Appwrite Functions securisees.
// ============================================================
import { Client, Functions, Query } from 'appwrite';
import { databases, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, UserRole } from '../constants';

const CREATE_EMPLOYEE_FUNCTION_ID = '6a55f8300015cb446152';
const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

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

/**
 * Met a jour le profil d'un employe via une Appwrite Function securisee
 * (verifie cote serveur que l'appelant est ADMIN avant toute modification).
 */
export async function updateEmployee(profileId: string, input: UpdateEmployeeInput) {
  const execution = await functions.createExecution(
    UPDATE_EMPLOYEE_FUNCTION_ID,
    JSON.stringify({ profileId, ...input }),
    false
  );

  const result = JSON.parse(execution.responseBody);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

export async function deactivateEmployee(profileId: string) {
  return updateEmployee(profileId, { isActive: false });
}

export async function reactivateEmployee(profileId: string) {
  return updateEmployee(profileId, { isActive: true });
}
