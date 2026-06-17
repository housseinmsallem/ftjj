import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const enabled = process.env.BACKUP_ENABLED === 'true';
if (enabled) {
  const dir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  cron.schedule(process.env.BACKUP_CRON || '0 2 * * *', () => {
    const file = path.join(dir, `ftjj-${new Date().toISOString().slice(0,10)}.archive`);
    const cmd = `mongodump --uri="${process.env.MONGO_URI}" --archive="${file}" --gzip`;
    exec(cmd, (err) => err ? console.error('[BACKUP ERROR]', err.message) : console.log('[BACKUP OK]', file));
  });
}
