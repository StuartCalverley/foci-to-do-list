import process from 'node:process';

import { createApp } from './app.js';
import { buildContainer } from './container.js';
import { openDatabase, resolveDbPath } from './infrastructure/db.js';

const port = Number(process.env.PORT ?? 3000);
const db = openDatabase(resolveDbPath());
const container = buildContainer(db);

createApp(container).listen(port, () => {
  process.stdout.write(`todo-api listening on http://localhost:${port}\n`);
});