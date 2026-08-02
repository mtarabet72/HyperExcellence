// ============================================================
// HyperExcellence - Lecture des circuits (checklists) depuis la base
// Remplace la liste CIRCUITS codee en dur dans ChecklistPage (Phase 6, etape E).
// ============================================================
import { Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS } from '../constants';

export interface Circuit {
  checklistId: string; // = $id du document (ex: "circuit-2-textile-pgc")
  zoneId: string;
  departmentId: string;
  title: string; // name
  titleAr: string; // name_ar
  subtitle: string;
  subtitleAr: string;
  transversal: boolean;
  circuitNumber: number | null;
  sortOrder: number;
  isActive: boolean;
}

function mapDoc(d: any): Circuit {
  return {
    checklistId: d.$id,
    zoneId: d.zone_id || '',
    departmentId: d.department_id || '',
    title: d.name || d.$id,
    titleAr: d.name_ar || d.name || d.$id,
    subtitle: d.subtitle || '',
    subtitleAr: d.subtitle_ar || d.subtitle || '',
    transversal: !!d.transversal,
    circuitNumber: d.circuit_number ?? null,
    sortOrder: d.sort_order ?? 999,
    isActive: d.is_active !== false,
  };
}

/** Tous les circuits actifs, tries par sort_order. */
export async function listCircuits(): Promise<Circuit[]> {
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.CHECKLIST_TEMPLATES,
    [Query.equal('is_active', true), Query.orderAsc('sort_order'), Query.limit(100)]
  );
  return (result.documents as any[]).map(mapDoc);
}

/** Tous les circuits, actifs ET desactives (pour l'admin). */
export async function listAllCircuits(): Promise<Circuit[]> {
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.CHECKLIST_TEMPLATES,
    [Query.orderAsc('sort_order'), Query.limit(100)]
  );
  return (result.documents as any[]).map(mapDoc);
}
