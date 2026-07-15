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
