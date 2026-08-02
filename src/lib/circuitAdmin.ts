// ============================================================
// HyperExcellence - Administration des circuits (CRUD via Function)
// `checklist_templates` est en lecture seule cote client (Phase 4/6).
// ============================================================
import { functions } from './appwrite';
import { Circuit, listAllCircuits } from './circuits';

const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

async function callFunction(payload: Record<string, unknown>) {
  const execution = await functions.createExecution(
    UPDATE_EMPLOYEE_FUNCTION_ID,
    JSON.stringify(payload),
    false
  );
  const result = JSON.parse(execution.responseBody);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

export { listAllCircuits };
export type { Circuit };

export interface CreateCircuitInput {
  circuitId: string; // slug : "circuit-6-surgeles"
  name: string;
  nameAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  departmentId: string;
  zoneId: string;
  circuitNumber?: number;
  transversal?: boolean;
  sortOrder?: number;
  frequency?: string;
  prpRef?: string;
}

export async function createCircuit(input: CreateCircuitInput) {
  return callFunction({ action: 'create_circuit', ...input });
}

export interface UpdateCircuitInput {
  circuitId: string;
  name?: string;
  nameAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  departmentId?: string;
  zoneId?: string;
  circuitNumber?: number;
  transversal?: boolean;
  sortOrder?: number;
  frequency?: string;
  prpRef?: string;
}

export async function updateCircuit(input: UpdateCircuitInput) {
  return callFunction({ action: 'update_circuit', ...input });
}

export async function toggleCircuit(circuitId: string, isActive: boolean) {
  return callFunction({ action: 'toggle_circuit', circuitId, isActive });
}
