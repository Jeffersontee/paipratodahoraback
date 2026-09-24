import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import * as fs from 'fs';
import HelpCategory from '../models/HelpCategory';
import { getEnvironmentVariables } from '../environments/enviroment';

async function runHelpExport() {
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
        console.log('✅ Conectado!');

        const categories = await HelpCategory.find().sort({ order: 1 }).lean();
        console.log(`📦 Encontradas ${categories.length} categorias de ajuda no banco de dados.`);

        const cleanCategories = categories.map((cat: any) => ({
            id: cat.id,
            title: cat.title,
            icon: cat.icon,
            order: cat.order || 0,
            topics: (cat.topics || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                content: t.content
            }))
        }));

        const dataDir = path.resolve(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const outputPath = path.join(dataDir, 'helpData.json');
        fs.writeFileSync(outputPath, JSON.stringify(cleanCategories, null, 2), 'utf-8');

        console.log(`💾 Dados de Ajuda exportados com sucesso para:\n   📄 ${outputPath}`);
        console.log('💡 Agora você pode commitar esse arquivo no Git e rodar "npm run seed:help" em staging/prod!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Erro durante a exportação da Central de Ajuda:', error?.message || error);
        process.exit(1);
    }
}

runHelpExport();
