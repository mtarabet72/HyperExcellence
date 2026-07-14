// ============================================================
// HyperExcellence - Gestion des employés (côté app React)
// Création via Appwrite Function sécurisée, lecture directe.
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

/**
 * Crée un nouvel employé via la Function serveur sécurisée.
 * Lève une erreur si l'appelant n'est pas Admin ou si les données sont invalides.
 */
export async function createEmployee(input: CreateEmployeeInput) {
  const execution = await functions.createExecution(
    CREATE_EMPLOYEE_FUNCTION_ID,
    JSON.stringify(input),
    false // synchrone : on attend le résultat
  );

  const result = JSON.parse(execution.responseBody);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

/**
 * Liste tous les employés (profils), du plus récent au plus ancien.
 */
export async function listEmployees(): Promise<Profile[]> {
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.orderDesc('$createdAt'), Query.limit(100)]
  );
  return result.documents as unknown as Profile[];
}
