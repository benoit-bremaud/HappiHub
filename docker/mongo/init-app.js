// First-volume initialization only; the API receives a database-scoped user, never root.
const fs = require('fs');
const user = fs.readFileSync('/run/secrets/mongo_app_user', 'utf8').trim();
const password = fs.readFileSync('/run/secrets/mongo_app_password', 'utf8').trim();
if (!user || !password) throw new Error('Application database credentials are required');
db.getSiblingDB('happihub').createUser({ user, pwd: password, roles: [{ role: 'readWrite', db: 'happihub' }] });
