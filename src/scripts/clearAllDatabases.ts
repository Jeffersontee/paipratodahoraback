import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';
import { Unit } from '../models/unit.model';
import { Service } from '../models/service.model';
import { ServiceOrder } from '../models/serviceorder.model';
import Plan from '../models/plan.model';
import Subscription from '../models/subscription.model';
import Invoice from '../models/invoice.model';
import HelpCategory from '../models/HelpCategory';
import { getEnvironmentVariables } from '../environments/enviroment';

const env = getEnvironmentVariables();
const envName = process.env.NODE_ENV || 'development';
const MONGO_URI = env.db_uri;
const isProd = process.env.NODE_ENV === 'production';
const isForce = process.env.FORCE_SEED === 'true' || process.env.FORCE === 'true';

async function clearAllDatabases() {
    if (isProd && !isForce) {
        console.error('🛑 ERRO DE SEGURANÇA: Execução em PRODUÇÃO detectada!');
        console.error('👉 Para forçar a limpeza em produção, defina a variável: FORCE_SEED=true');
        process.exit(1);
    }

    try {
        console.log(`🔗 Conectando ao MongoDB (${process.env.NODE_ENV || 'development'})...`);
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB.');

        console.log('🧹 Limpando todas as coleções do Bravo DB...');
        await Promise.all([
            User.deleteMany({}),
            Company.deleteMany({}),
            Unit.deleteMany({}),
            Service.deleteMany({}),
            ServiceOrder.deleteMany({}),
            Plan.deleteMany({}),
            Subscription.deleteMany({}),
            Invoice.deleteMany({}),
            HelpCategory.deleteMany({})
        ]);

        console.log('✅ Todas as coleções foram limpas com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao limpar o banco de dados:', error);
        process.exit(1);
    }
}

clearAllDatabases();
