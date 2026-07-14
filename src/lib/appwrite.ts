// ============================================================
// HyperExcellence - Client Appwrite (navigateur)
// Ce fichier utilise le SDK "appwrite" (client), différent de
// "node-appwrite" (serveur, utilisé uniquement dans scripts/)
// ============================================================
import { Client, Account, Databases } from 'appwrite';

export const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = '6a55488800125e9fd03e';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export default client;
