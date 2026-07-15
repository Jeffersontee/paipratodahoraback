import { Utils } from './utils/Utils';
Utils.dotenvConfigs();

import { Server } from './server';

export const app = new Server().app;
let port = parseInt(process.env.PORT || '3000') || 3000;
const hostname = process.env.HOSTNAME || process.env.HOST || '0.0.0.0';
process.env.TZ = "America/Sao_Paulo";

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        const env = process.env.NODE_ENV || 'development';
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(`🐧 [${env.toUpperCase()}] Server is running ${hostname} at port ${port} (Local Time: ${now})`);
    });
}
