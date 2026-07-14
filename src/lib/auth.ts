// ============================================================
// HyperExcellence - Authentification Badge + PIN
// Encapsule Appwrite Account derrière une interface badge/PIN
// ============================================================
import { ID } from 'appwrite';
import { account } from './appwrite';

const EMAIL_DOMAIN = 'hyperexcellence.local';

/**
 * Convertit un numéro de badge en email technique Appwrite.
 * Ex: "B00123" -> "b00123@hyperexcellence.local"
 */
function badgeToEmail(badgeNumber: string): string {
  const normalized = badgeNumber.trim().toLowerCase().replace(/\s+/g, '');
  return `${normalized}@${EMAIL_DOMAIN}`;
}

/**
 * Transforme un PIN court (4-6 chiffres) en mot de passe Appwrite valide
 * (minimum 8 caractères). Doit être STRICTEMENT identique à la fonction
 * utilisée dans scripts/appwrite-seed-admin.mjs et tout futur script de
 * création d'employé, sinon la connexion échouera.
 */
function deriveAppwritePassword(pin: string): string {
  const cleanPin = pin.trim().padStart(4, '0');
  return `HXC-${cleanPin}-SEC`;
}

/**
 * Connexion via badge + PIN.
 * Lève une erreur si badge/PIN incorrect (à afficher à l'écran).
 */
export async function loginWithBadge(badgeNumber: string, pin: string) {
  const email = badgeToEmail(badgeNumber);
  const password = deriveAppwritePassword(pin);
  return account.createEmailPasswordSession(email, password);
}

/**
 * Déconnexion : supprime la session courante.
 */
export async function logout() {
  return account.deleteSession('current');
}

/**
 * Récupère l'utilisateur Appwrite actuellement connecté.
 * Retourne null si personne n'est connecté.
 */
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/**
 * Utilisé uniquement par l'Admin pour créer un nouvel employé.
 * badgeNumber + pin + nom complet -> crée le compte Appwrite Auth.
 */
export async function createEmployeeAccount(
  badgeNumber: string,
  pin: string,
  fullName: string
) {
  const email = badgeToEmail(badgeNumber);
  const password = deriveAppwritePassword(pin);
  return account.create(ID.unique(), email, password, fullName);
}
