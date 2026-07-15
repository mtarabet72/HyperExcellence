// ============================================================
// HyperExcellence - Upload de photos (bucket task-photos)
// ============================================================
import { Client, Storage, ID } from 'appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from './appwrite';

const TASK_PHOTOS_BUCKET_ID = '6a57962800214de6f2f8';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const storage = new Storage(client);

/**
 * Upload une photo dans le bucket task-photos.
 * Retourne l'URL publique de visualisation.
 */
export async function uploadTaskPhoto(file: File): Promise<string> {
  const uploaded = await storage.createFile(TASK_PHOTOS_BUCKET_ID, ID.unique(), file);
  return storage.getFileView(TASK_PHOTOS_BUCKET_ID, uploaded.$id).toString();
}
