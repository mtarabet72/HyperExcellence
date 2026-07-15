// ============================================================
// HyperExcellence - Constantes centrales
// Source de vérité unique pour rôles, gravités, statuts, piliers
// ============================================================

// ---------- RÔLES (Circuit 9) ----------
export const ROLES = {
  ADMIN: 'ADMIN',
  CHEF_SECTEUR: 'CHEF_SECTEUR',
  CHEF_DEPARTEMENT: 'CHEF_DEPARTEMENT',
  CHEF_RAYON: 'CHEF_RAYON',
  SUPERVISEUR: 'SUPERVISEUR',
  CHEF_SECURITE: 'CHEF_SECURITE',
  ASJ: 'ASJ',
  CHEF_CAISSE: 'CHEF_CAISSE',
  MAITRE_METIER: 'MAITRE_METIER',
  EMPLOYE: 'EMPLOYE',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur QHSE',
  CHEF_SECTEUR: 'Chef de Secteur',
  CHEF_DEPARTEMENT: 'Chef de Département',
  CHEF_RAYON: 'Chef de Rayon',
  SUPERVISEUR: 'Superviseur Commerce',
  CHEF_SECURITE: 'Chef Sécurité',
  ASJ: 'Agent ASJ',
  CHEF_CAISSE: 'Chef de Caisse',
  MAITRE_METIER: 'Maître Métier',
  EMPLOYE: 'Employé / Vendeur',
};

// ---------- PILIERS (Circuits 1, 2, 4, 5) ----------
export const PILIERS = {
  1: { nom: 'Confort et Environnement Client', tacheDebut: 1, tacheFin: 26 },
  2: { nom: 'Service Client SBAM', tacheDebut: 27, tacheFin: 185 },
  3: { nom: 'Libre Service et Ruptures', tacheDebut: 189, tacheFin: 214 },
  4: { nom: 'Caisses', tacheDebut: 220, tacheFin: 228 },
} as const;

export type PilierId = keyof typeof PILIERS;

// ---------- GRAVITÉ NON CONFORMITÉ (Circuit 6) ----------
export const GRAVITES = {
  MINEURE: 'MINEURE',
  MAJEURE: 'MAJEURE',
  CRITIQUE: 'CRITIQUE',
} as const;

export type Gravite = (typeof GRAVITES)[keyof typeof GRAVITES];

export const GRAVITE_LABELS: Record<Gravite, string> = {
  MINEURE: 'Mineure',
  MAJEURE: 'Majeure',
  CRITIQUE: 'Critique',
};

// Qui est notifié selon la gravité (Circuit 6, étape 3)
export const GRAVITE_NOTIFICATION: Record<Gravite, UserRole[]> = {
  MINEURE: [ROLES.CHEF_RAYON],
  MAJEURE: [ROLES.CHEF_RAYON, ROLES.CHEF_SECTEUR],
  CRITIQUE: [ROLES.CHEF_RAYON, ROLES.CHEF_SECTEUR, ROLES.ADMIN],
};

export const GRAVITE_COLORS: Record<Gravite, string> = {
  MINEURE: '#eab308', // jaune
  MAJEURE: '#f97316', // orange
  CRITIQUE: '#ef4444', // rouge
};

// ---------- STATUT TÂCHE (aligné avec Appwrite) ----------
export const TASK_STATUS = {
  FAIT: 'FAIT',
  NON_FAIT: 'NON_FAIT',
  ECART: 'ECART',
  NON_APPLICABLE: 'NON_APPLICABLE',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  FAIT: 'Fait',
  NON_FAIT: 'Non fait',
  ECART: 'Écart',
  NON_APPLICABLE: 'Non applicable',
};

// ---------- STATUT NON CONFORMITÉ ----------
export const NC_STATUS = {
  OUVERTE: 'OUVERTE',
  EN_COURS: 'EN_COURS',
  CLOTUREE: 'CLOTUREE',
} as const;

export type NCStatus = (typeof NC_STATUS)[keyof typeof NC_STATUS];

export const NC_STATUS_LABELS: Record<NCStatus, string> = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  CLOTUREE: 'Clôturée',
};

// ---------- NIVEAU DE RISQUE ZONE (HACCP) ----------
export const RISK_LEVELS = {
  CRITIQUE: 'CRITIQUE',
  MAJEUR: 'MAJEUR',
  MINEUR: 'MINEUR',
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

// ---------- FRÉQUENCE CHECKLIST ----------
export const FREQUENCIES = {
  QUOTIDIENNE: 'QUOTIDIENNE',
  HEBDO: 'HEBDO',
  MENSUELLE: 'MENSUELLE',
  PONCTUELLE: 'PONCTUELLE',
} as const;

export type Frequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

// ---------- APPWRITE : IDs de base et collections ----------
export const APPWRITE_DATABASE_ID = 'hyperclean_pro';

export const COLLECTIONS = {
  DEPARTMENTS: 'departments',
  ZONES: 'zones',
  PROFILES: 'profiles',
  CHECKLIST_TEMPLATES: 'checklist_templates',
  TASK_TEMPLATES: 'task_templates',
  TASK_EXECUTIONS: 'task_executions',
  NON_CONFORMITES: 'non_conformites',
  CAPA: 'capa',
  AUDIT_LOG: 'audit_log',
} as const;

// ---------- DÉPARTEMENTS / RAYONS (correspond aux Teams Appwrite) ----------
export const DEPARTMENTS = [
  { id: 'boucherie', name: 'Boucherie / Volaille à la coupe', secteur: 'FRAIS' },
  { id: 'poissonnerie', name: 'Poissonnerie', secteur: 'FRAIS' },
  { id: 'traiteur', name: 'Traiteur', secteur: 'FRAIS' },
  { id: 'fromage_charcuterie', name: 'Fromage / Charcuterie à la coupe', secteur: 'FRAIS' },
  { id: 'boulangerie', name: 'Boulangerie / Pâtisserie', secteur: 'FRAIS' },
  { id: 'fruits_legumes', name: 'Fruits et Légumes', secteur: 'FRAIS' },
  { id: 'epices_vrac', name: 'Épices / Olives / Vrac', secteur: 'FRAIS' },
  { id: 'electromenager', name: 'Electroménager', secteur: 'PGC' },
  { id: 'textile_pgc', name: 'Textile / Literie / PGC', secteur: 'PGC' },
  { id: 'apls_frais_ls', name: 'Libre Service Frais (APLS)', secteur: 'PGC' },
  { id: 'rayon_pgc_ruptures', name: 'Rayon PGC - Produits Imposés', secteur: 'PGC' },
  { id: 'confort_environnement', name: 'Confort & Environnement', secteur: 'SUPPORT' },
  { id: 'securite', name: 'Sécurité', secteur: 'SUPPORT' },
  { id: 'caisses', name: 'Caisses', secteur: 'SUPPORT' },
] as const;

// ---------- LIBELLÉS DES CIRCUITS (pour Dashboard + PDF) ----------
export const CIRCUIT_TITLES: Record<string, string> = {
  'circuit-1-confort': 'Circuit 1 — Confort',
  'circuit-2-boucherie': 'Circuit 2 — SBAM Boucherie',
  'circuit-2-fromage-charcuterie': 'Circuit 2 — SBAM Fromage/Charcuterie',
  'circuit-2-boulangerie': 'Circuit 2 — SBAM Boulangerie',
  'circuit-2-poissonnerie': 'Circuit 2 — SBAM Poissonnerie',
  'circuit-2-traiteur': 'Circuit 2 — SBAM Traiteur',
  'circuit-2-fruits-legumes': 'Circuit 2 — SBAM Fruits/Légumes',
  'circuit-2-epices-vrac': 'Circuit 2 — SBAM Épices/Vrac',
  'circuit-2-electromenager': 'Circuit 2 — SBAM Electroménager',
  'circuit-2-textile-pgc': 'Circuit 2 — SBAM Textile/PGC',
  'circuit-3-pnd-haccp': 'Circuit 3 — PND HACCP',
  'circuit-4-libre-service': 'Circuit 4 — Libre Service/Ruptures',
  'circuit-5-caisses': 'Circuit 5 — Caisses',
};

// ---------- LIBELLÉS DES PILIERS (regroupement PDF, Circuit 7) ----------
export const PILIER_LABELS_BY_CIRCUIT_NUMBER: Record<number, string> = {
  1: 'PILIER 01 — Confort et Environnement Client',
  2: 'PILIER 02 — Service Client SBAM',
  3: 'HYGIÈNE, NETTOYAGE ET DÉSINFECTION — PND HACCP (transversal)',
  4: 'PILIER 03 — Libre Service et Ruptures',
  5: 'PILIER 04 — Caisses',
};
// ---------- HIÉRARCHIE DES RÔLES (Circuit 9) ----------
// Rang plus élevé = plus d'autorité. Utilisé pour la validation des NC.
export const ROLE_RANK: Record<UserRole, number> = {
  EMPLOYE: 0,
  ASJ: 0,
  CHEF_CAISSE: 1,
  CHEF_SECURITE: 1,
  MAITRE_METIER: 1,
  CHEF_RAYON: 1,
  CHEF_DEPARTEMENT: 2,
  CHEF_SECTEUR: 3,
  SUPERVISEUR: 0, // lecture seule, ne participe pas à la validation
  ADMIN: 4,
};

// Rang minimum requis pour QUALIFIER une NC (créer la CAPA), selon la gravité
export const GRAVITE_MIN_RANK_QUALIFICATION: Record<Gravite, number> = {
  MINEURE: ROLE_RANK.CHEF_RAYON, // 1
  MAJEURE: ROLE_RANK.CHEF_SECTEUR, // 3
  CRITIQUE: ROLE_RANK.ADMIN, // 4
};

export function canQualifyNC(role: UserRole, gravite: Gravite): boolean {
  if (role === ROLES.SUPERVISEUR) return false; // lecture seule
  return ROLE_RANK[role] >= GRAVITE_MIN_RANK_QUALIFICATION[gravite];
}

// Vérification & clôture : réservé au QHSE (Admin), Circuit 6 étape 6
export function canVerifyAndCloseNC(role: UserRole): boolean {
  return role === ROLES.ADMIN;
}
