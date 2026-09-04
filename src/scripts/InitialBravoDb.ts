import mongoose from 'mongoose';
import dotenv from 'dotenv';
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
import { seedHelpTopics } from '../utils/seedHelpTopics';
import bcrypt from 'bcrypt';

dotenv.config();

const env = getEnvironmentVariables();
const MONGO_URI =
    env.db_uri ||
    process.env.PROD_DB_URI ||
    process.env.STAGING_DB_URI ||
    process.env.DEV_DB_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DB_URI ||
    'mongodb://localhost:27017/bravo-instalacoes';

async function clearDatabase() {
    console.log('🧹 Limpando coleções antigas...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Unit.deleteMany({});
    await Service.deleteMany({});
    await ServiceOrder.deleteMany({});
    await HelpCategory.deleteMany({});
    await Plan.deleteMany({});
    await Subscription.deleteMany({});
    await Invoice.deleteMany({});
    console.log('✅ Coleções limpas.');
}

export async function initBravoBase() {
    console.log('🏛️ Inicializando estrutura base da plataforma Bravo Instalações...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Bravo@25', salt);

    // 1. PLANOS SAAS DO SISTEMA
    console.log('📦 Semeando Planos SaaS...');
    const planTrial = await Plan.create({
        name: 'Trial',
        price: 0,
        billing_cycle: 'monthly',
        max_services: 5,
        max_units: 2,
        max_users: 2,
        catalog_module_enabled: true,
        status: 'active',
        description: 'Período gratuito de degustação com recursos básicos.',
        features: ['Até 5 serviços no catálogo', '2 unidades/filiais', '2 usuários', 'Suporte padrão']
    });

    const planLite = await Plan.create({
        name: 'Lite',
        price: 99,
        billing_cycle: 'monthly',
        max_services: 10,
        max_units: 5,
        max_users: 3,
        catalog_module_enabled: true,
        status: 'active',
        description: 'Ideal para pequenas empresas iniciando a gestão técnica.',
        features: ['Até 10 serviços no catálogo', '5 unidades/filiais', '3 usuários', 'Agenda 365', 'Suporte WhatsApp']
    });

    const planPro = await Plan.create({
        name: 'Pro',
        price: 199,
        billing_cycle: 'monthly',
        max_services: 25,
        max_units: 15,
        max_users: 10,
        catalog_module_enabled: true,
        status: 'active',
        description: 'Para empresas em expansão que demandam relatórios e maior capacidade.',
        features: [
            'Até 25 serviços no catálogo',
            '15 unidades/filiais',
            '10 usuários',
            'Agenda 365',
            'Relatórios consolidados',
            'Logs de auditoria'
        ]
    });

    const planPremium = await Plan.create({
        name: 'Premium',
        price: 349,
        billing_cycle: 'monthly',
        max_services: 100,
        max_units: 50,
        max_users: 30,
        catalog_module_enabled: true,
        status: 'active',
        description: 'Plano completo e ilimitado para grandes operações com suporte dedicado.',
        features: [
            'Serviços ilimitados',
            '50 unidades/filiais',
            '30 usuários',
            'Auditoria completa',
            'Atendimento prioritário 24/7'
        ]
    });
    console.log('✅ Planos SaaS criados (Trial, Lite, Pro, Premium).');

    // 2. USUÁRIOS GLOBAIS (STAFF HQ DO SISTEMA)
    console.log('👑 Semeando Equipe Administrativa Global (Super Admin & Staff)...');
    const superAdmin = await User.create({
        name: 'Super Admin',
        email: 'admin@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_admin',
        role: 'root',
        phone: '11999990000',
        status: 'active',
        email_verified: true
    });

    const superSupervisor = await User.create({
        name: 'Carlos Supervisor Geral',
        email: 'supervisor@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_staff',
        role: 'supervisor',
        phone: '11999990001',
        status: 'active',
        email_verified: true
    });

    const superOperator = await User.create({
        name: 'Luciana Operadora Geral',
        email: 'operador@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_staff',
        role: 'backoffice',
        phone: '11999990002',
        status: 'active',
        email_verified: true
    });

    const globalTechnician = await User.create({
        name: 'Ronaldo Técnico Geral',
        email: 'tecnico@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'collaborator',
        role: 'technician',
        technician_profile: {
            specialties: ['Elétrica', 'Climatização', 'Hidráulica'],
            is_available_now: true
        },
        company_id: null,
        phone: '11999990003',
        status: 'active',
        email_verified: true
    });
    console.log('✅ Usuários globais (Super Admin, Supervisor, Operador, Técnico Global) criados.');

    // 3. CATÁLOGO GLOBAL DE SERVIÇOS (TEMPLATES BASE DA BRAVO)
    console.log('🛠️ Semeando Catálogo Global de Serviços Base...');
    await Service.create([
        {
            name: 'Instalação de Chopeira e Sistema de Chopp',
            description: 'Instalação completa de torneiras, cilindro CO2, pré-resfriadores e regulagem de pressão.',
            category: 'Refrigeração',
            icon: 'snow-outline',
            price: 550,
            status: 'ACTIVE',
            company_id: null
        },
        {
            name: 'Manutenção de Quadro Elétrico Trifásico',
            description: 'Revisão geral, troca e reaperto de disjuntores industriais e balanceamento de fases.',
            category: 'Elétrica',
            icon: 'flash-outline',
            price: 350,
            status: 'ACTIVE',
            company_id: null
        },
        {
            name: 'Instalação e Manutenção de Iluminação LED',
            description: 'Substituição de luminárias de alta eficiência, refletores e fitas LED comerciais.',
            category: 'Elétrica',
            icon: 'bulb-outline',
            price: 180,
            status: 'ACTIVE',
            company_id: null
        },
        {
            name: 'Reparo e Desobstrução Hidráulica Comercial',
            description: 'Conserto de tubulações, bombas d’água, válvulas de descarga e caixas de gordura.',
            category: 'Hidráulica',
            icon: 'water-outline',
            price: 280,
            status: 'ACTIVE',
            company_id: null
        },
        {
            name: 'Manutenção de Portões Automáticos e Fechaduras',
            description: 'Troca de placas centrais, cremalheiras, regulagem de motores e fechaduras digitais.',
            category: 'Serralheria',
            icon: 'construct-outline',
            price: 320,
            status: 'ACTIVE',
            company_id: null
        }
    ]);
    console.log('✅ Catálogo global de serviços semeado.');

    // 4. CENTRAL DE AJUDA
    console.log('📚 Semeando Central de Ajuda...');
    await seedHelpTopics();
    console.log('✅ Central de Ajuda semeada com sucesso!');

    return {
        plans: { planTrial, planLite, planPro, planPremium },
        staff: { superAdmin, superSupervisor, superOperator, globalTechnician },
        hashedPassword
    };
}

async function run() {
    try {
        console.log('🔗 Conectando ao MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB.');

        await clearDatabase();
        await initBravoBase();

        console.log('🎉 Estrutura base da Bravo inicializada com sucesso (sem empresas fictícias)!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante a inicialização:', error);
        process.exit(1);
    }
}

// Executa se invocado diretamente
if (require.main === module) {
    run();
}
