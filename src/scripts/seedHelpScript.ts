import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import { seedHelpTopics } from '../utils/seedHelpTopics';
import { getEnvironmentVariables } from '../environments/enviroment';

async function runHelpSeed() {
    const env = getEnvironmentVariables();
    const envName = process.env.NODE_ENV || 'development';
    const dbUri = env.db_uri;

    if (!dbUri) {
        console.error(`❌ db_uri não configurada para o ambiente [${envName.toUpperCase()}].`);
        process.exit(1);
    }

    try {
        const maskedUri = dbUri.replace(/:([^:@]+)@/, ':****@');
        console.log(`🚀 Conectando ao banco de dados do Bravo [${envName.toUpperCase()}] -> ${maskedUri}...`);
        await mongoose.connect(dbUri);
        console.log('✅ Conectado com sucesso ao MongoDB!');

        console.log('⏳ Mesclando e sincronizando a coleção "help_categories"...');
        await seedHelpTopics();

        console.log('🎉 Central de Ajuda sincronizada perfeitamente!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Erro durante o seed da Central de Ajuda:', error?.message || error);
        process.exit(1);
    }
}

runHelpSeed();
