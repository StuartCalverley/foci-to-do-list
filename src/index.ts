import process from 'node:process';

import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  process.stdout.write(`todo-api listening on http://localhost:${port}\n`);
});