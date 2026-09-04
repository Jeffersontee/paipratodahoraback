import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { seedHelpTopics } from '../utils/seedHelpTopics';

async function runHelpSeed() {
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || 'mongodb://localhost:27017/bravo-instalacoes';

    if (!dbUri) {
        console.error('❌ Variável MONGODB_URI não encontrada.');
        process.exit(1);
    }

    try {
        const envName = process.env.NODE_ENV || 'development';
        console.log(`🚀 Conectando ao banco de dados do Bravo (${envName})...`);
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
