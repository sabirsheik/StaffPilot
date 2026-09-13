import path from 'path';
import { env } from './env.js';

export const UPLOADS_DIR = path.resolve(env.uploadsDir || path.join(process.cwd(), 'uploads'));
export const PROJECT_UPLOAD_DIR = path.join(UPLOADS_DIR, 'projects');
export const TASK_UPLOAD_DIR = path.join(UPLOADS_DIR, 'tasks');
