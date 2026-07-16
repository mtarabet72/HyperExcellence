// ============================================================
// HyperExcellence - Authentification Badge + PIN
// Phase 4 Securite : garde-fou anti brute-force (5 essais, 15 min).
// ============================================================
import { ID, Client, Functions } from 'appwrite';
import { account, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from './appwrite';

const EMAIL_DOMAIN = 'hyperexcellence.local';
const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

const guardClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);
const guardFunctions = new Functions(guardClient);

function badgeToEmail(badgeNumber: string): string {
  const normalized = badgeNumber.trim().toLowerCase().replace(/\s+/g, '');
  return `${normalized}@${EMAIL_DOMAIN}`;
}

function deriveAppwritePassword(pin: string): string {
  const cleanPin = pin.trim().padStart(4, '0');
  return `HXC-${cleanPin}-SEC`;
}

async function callGuard(badgeNumber: string, action: 'check' | 'fail' | 'reset') {
  const execution = await guardFunctions.createExecution(
    UPDATE_EMPLOYEE_FUNCTION_ID,
    JSON.stringify({ badgeNumber, action }),
    false
  );
  return JSON.parse(execution.responseBody);
}

export class AccountLockedError extends Error {
  minutesLeft: number;
  constructor(minutesLeft: number) {
    super(`Compte bloque pendant encore ${minutesLeft} minute(s).`);
    this.minutesLeft = minutesLeft;
  }
}

/**
 * Connexion via badge + PIN, protegee par le garde-fou anti brute-force.
 */
export async function loginWithBadge(badgeNumber: string, pin: string) {
  // 1. Verifie que le compte n'est pas bloque avant de tenter quoi que ce soit
  const checkResult = await callGuard(badgeNumber, 'check');
  if (checkResult.allowed === false) {
    throw new AccountLockedError(checkResult.minutesLeft || 15);
  }

  const email = badgeToEmail(badgeNumber);
  const password = deriveAppwritePassword(pin);

  try {
    const session = await account.createEmailPasswordSession(email, password);
    // 2. Succes : reinitialise le compteur d'echecs
    await callGuard(badgeNumber, 'reset').catch(() => {});
    return session;
  } catch (e) {
    // 3. Echec : enregistre la tentative ratee
    await callGuard(badgeNumber, 'fail').catch(() => {});
    throw e;
  }
}

export async function logout() {
  return account.deleteSession('current');
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function createEmployeeAccount(
  badgeNumber: string,
  pin: string,
  fullName: string
) {
  const email = badgeToEmail(badgeNumber);
  const password = deriveAppwritePassword(pin);
  return account.create(ID.unique(), email, password, fullName);
}
