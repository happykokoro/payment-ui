import { randomBytes, scryptSync } from 'node:crypto';
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
console.log('Dashboard login password (save in your password manager): ' + password);
console.log('DASHBOARD_PASSWORD_HASH=' + salt + ':' + scryptSync(password, salt, 64).toString('hex'));
console.log('UI_SESSION_KEY=' + randomBytes(32).toString('hex'));
