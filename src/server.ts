import app from './index';
import { connectDatabase } from './config/database';

const PORT = process.env['PORT'] || 3000;

async function startServer() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(` Server executando na porta http://localhost:${PORT}`);
  });
}

startServer();
