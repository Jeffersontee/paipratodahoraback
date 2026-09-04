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
import { seedHelpTopics } from '../utils/seedHelpTopics';
import bcrypt from 'bcrypt';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bravo-instalacoes';

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

async function seedDatabase() {
    console.log('🌱 Iniciando sementeira rica do Bravo DB...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Bravo@25', salt);

    // 0. PLANOS SAAS DO SISTEMA
    console.log('📦 Semeando Planos...');
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

    // 1. USUÁRIOS GLOBAIS (STAFF DO SISTEMA)
    const superAdmin = await User.create({
        name: 'Super Admin',
        email: 'admin@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_admin',
        role: 'root',
        phone: '11999990000',
        status: 'active'
    });

    const superSupervisor = await User.create({
        name: 'Carlos Supervisor Geral',
        email: 'supervisor@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_staff',
        role: 'supervisor',
        phone: '11999990001',
        status: 'active'
    });

    const superOperator = await User.create({
        name: 'Luciana Operadora Geral',
        email: 'operador@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_staff',
        role: 'backoffice',
        phone: '11999990002',
        status: 'active'
    });
    console.log('✅ Usuários globais (Staff) criados.');

    // 2. EMPRESAS PARCEIRAS (COMPANIES)
    const zeDelivery = await Company.create({
        name: 'Zé Delivery',
        cnpj: '12.345.678/0001-99',
        status: 'ACTIVE',
        subscription_status: 'active',
        plan_id: planPro._id,
        plan_name: planPro.name,
        monthly_revenue: 199
    });

    const flashLtda = await Company.create({
        name: 'Flash Ltda',
        cnpj: '00.000.000/0000-50',
        status: 'ACTIVE',
        subscription_status: 'active',
        plan_id: planPremium._id,
        plan_name: planPremium.name,
        monthly_revenue: 349
    });

    const ambev = await Company.create({
        name: 'Ambev Distribuidora',
        cnpj: '99.999.999/0001-22',
        status: 'ACTIVE',
        subscription_status: 'trialing',
        plan_id: planTrial._id,
        plan_name: planTrial.name,
        monthly_revenue: 0
    });
    console.log('✅ Empresas (Zé Delivery, Flash, Ambev) criadas.');

    // 3. ASSINATURAS (SUBSCRIPTIONS)
    console.log('💳 Criando Assinaturas das Empresas...');
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const trialEnd = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

    const subFlash = await Subscription.create({
        company_id: flashLtda._id,
        plan_id: planPremium._id,
        status: 'active',
        price_at_subscription: planPremium.price,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        payment_method: 'pix',
        payment_status: 'paid',
        monthly_revenue: planPremium.price,
        total_revenue: planPremium.price * 9
    });

    const subZD = await Subscription.create({
        company_id: zeDelivery._id,
        plan_id: planPro._id,
        status: 'active',
        price_at_subscription: planPro.price,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        payment_method: 'pix',
        payment_status: 'paid',
        monthly_revenue: planPro.price,
        total_revenue: planPro.price * 8
    });

    const subAmbev = await Subscription.create({
        company_id: ambev._id,
        plan_id: planTrial._id,
        status: 'trialing',
        price_at_subscription: 0,
        current_period_start: now,
        current_period_end: trialEnd,
        payment_method: 'pix',
        payment_status: 'pending',
        monthly_revenue: 0,
        total_revenue: 0
    });
    console.log('✅ Assinaturas criadas com sucesso.');

    // 4. FATURAS MENSAIS (INVOICES - PARA GRÁFICOS E HISTÓRICO DE COBRANÇAS)
    console.log('💰 Semeando Histórico de Faturas...');
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const invoiceDocs: any[] = [];

    // Faturas históricas pagas para Flash Ltda nos meses anteriores
    for (let m = 0; m < currentMonth; m++) {
        const dueDate = new Date(currentYear, m, 10);
        const payDate = new Date(currentYear, m, 9);
        invoiceDocs.push({
            company_id: flashLtda._id,
            subscription_id: subFlash._id,
            amount: 349,
            status: 'paid',
            payment_method: 'pix',
            payment_date: payDate,
            due_date: dueDate,
            notes: `Mensalidade SaaS Ciclo ${m + 1}/${currentYear} (Plano Premium)`
        });
    }

    // Fatura do mês atual pendente para Flash Ltda
    invoiceDocs.push({
        company_id: flashLtda._id,
        subscription_id: subFlash._id,
        amount: 349,
        status: 'pending',
        payment_method: 'pix',
        due_date: new Date(currentYear, currentMonth, 15),
        notes: `Mensalidade SaaS Ciclo Atual ${currentMonth + 1}/${currentYear} (Plano Premium)`
    });

    // Faturas históricas pagas para Zé Delivery
    for (let m = 1; m < currentMonth; m++) {
        const dueDate = new Date(currentYear, m, 5);
        const payDate = new Date(currentYear, m, 5);
        invoiceDocs.push({
            company_id: zeDelivery._id,
            subscription_id: subZD._id,
            amount: 199,
            status: 'paid',
            payment_method: 'pix',
            payment_date: payDate,
            due_date: dueDate,
            notes: `Mensalidade SaaS Ciclo ${m + 1}/${currentYear} (Plano Pro)`
        });
    }

    // Fatura do mês atual pendente para Zé Delivery
    invoiceDocs.push({
        company_id: zeDelivery._id,
        subscription_id: subZD._id,
        amount: 199,
        status: 'pending',
        payment_method: 'pix',
        due_date: new Date(currentYear, currentMonth, 20),
        notes: `Mensalidade SaaS Ciclo Atual ${currentMonth + 1}/${currentYear} (Plano Pro)`
    });

    // Fatura vencida de teste (Overdue)
    invoiceDocs.push({
        company_id: zeDelivery._id,
        subscription_id: subZD._id,
        amount: 199,
        status: 'overdue',
        payment_method: 'pix',
        due_date: new Date(currentYear, currentMonth - 1, 5),
        notes: 'Mensalidade com atraso em cobrança preventiva.'
    });

    await Invoice.insertMany(invoiceDocs);
    console.log(`✅ ${invoiceDocs.length} Faturas mensais semeadas para o histórico e gráficos SaaS.`);

    // 5. PROPRIETÁRIOS DE EMPRESAS (COMPANY OWNERS)
    const joaoOwner = await User.create({
        name: 'João Proprietário (Zé Delivery)',
        email: 'joao@zedelivery.com',
        password: hashedPassword,
        type: 'company_owner',
        role: 'owner',
        company_id: zeDelivery._id,
        phone: '11988880001',
        status: 'active'
    });

    const barryOwner = await User.create({
        name: 'Barry Allen (Flash)',
        email: 'barry@flash.com',
        password: hashedPassword,
        type: 'company_owner',
        role: 'owner',
        company_id: flashLtda._id,
        phone: '11988880002',
        status: 'active'
    });

    const ambevOwner = await User.create({
        name: 'Diretoria Ambev',
        email: 'diretor@ambev.com',
        password: hashedPassword,
        type: 'company_owner',
        role: 'owner',
        company_id: ambev._id,
        phone: '11988880003',
        status: 'active'
    });
    console.log('✅ Proprietários de empresas criados.');

    // 6. COLABORADORES E OPERADORES ASSOCIADOS
    const carlosTecnicoZD = await User.create({
        name: 'Carlos Técnico',
        email: 'carlos@zedelivery.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'technician',
        technician_profile: {
            specialties: ['Elétrica', 'Climatização'],
            is_available_now: true
        },
        company_id: zeDelivery._id,
        phone: '11977770001',
        status: 'active'
    });

    const lucasSupervisorZD = await User.create({
        name: 'Lucas Supervisor ZD',
        email: 'lucas@zedelivery.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'supervisor',
        company_id: zeDelivery._id,
        phone: '11977770002',
        status: 'active'
    });

    const pedroTecnicoFlash = await User.create({
        name: 'Pedro Técnico Flash',
        email: 'pedro@flash.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'technician',
        technician_profile: {
            specialties: ['Hidráulica', 'CFTV'],
            is_available_now: true
        },
        company_id: flashLtda._id,
        phone: '11977770003',
        status: 'active'
    });

    const anaOperadoraFlash = await User.create({
        name: 'Ana Operadora Flash',
        email: 'ana@flash.com',
        password: hashedPassword,
        type: 'admin',
        role: 'backoffice',
        company_id: flashLtda._id,
        phone: '11977770004',
        status: 'active'
    });

    // 7. CLIENTE FINAL (CONSUMER B2C)
    const customerUser = await User.create({
        name: 'Jefferson Customer',
        email: 'user@user.com',
        password: hashedPassword,
        type: 'user',
        role: 'customer',
        status: 'active',
        phone: '11988887777'
    });
    console.log('✅ Colaboradores e Cliente Final criados.');

    // 8. UNIDADES / FILIAIS (UNITS)
    const VilaRe = await Unit.create({
        name: 'Unidade Vila Ré',
        company_id: zeDelivery._id,
        address: {
            street: 'Rua Itinguçu',
            number: '1200',
            neighborhood: 'Vila Ré',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '03658-010'
        },
        phone: '11999990001',
        status: 'ACTIVE'
    });

    const itaquera = await Unit.create({
        name: 'Unidade Itaquera',
        company_id: zeDelivery._id,
        address: {
            street: 'Av. Radial Leste',
            number: '5000',
            neighborhood: 'Itaquera',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '08210-040'
        },
        phone: '11999990002',
        status: 'ACTIVE'
    });

    const paulista = await Unit.create({
        name: 'Unidade Paulista',
        company_id: flashLtda._id,
        address: {
            street: 'Avenida Paulista',
            number: '1000',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '01310-100'
        },
        phone: '11999990003',
        status: 'ACTIVE'
    });

    const joaoDias = await Unit.create({
        name: 'Unidade João Dias',
        company_id: flashLtda._id,
        address: {
            street: 'Estrada de Itapecerica',
            number: '500',
            neighborhood: 'Vila Andrade',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '05835-005'
        },
        phone: '11999990004',
        status: 'ACTIVE'
    });
    console.log('✅ Unidades operacionais criadas.');

    // 9. SERVIÇOS TÉCNICOS (CATÁLOGO)
    const servicesZD = await Service.create([
        {
            name: 'Instalação Elétrica Trifásica',
            description: 'Instalação completa de painel trifásico e disjuntores industriais.',
            category: 'Elétrica',
            icon: 'flash-outline',
            price: 450,
            status: 'ACTIVE',
            company_id: zeDelivery._id
        },
        {
            name: 'Manutenção de Portões Automáticos',
            description: 'Troca de placas, cremalheiras e balanceamento de motores.',
            category: 'Serralheria',
            icon: 'construct-outline',
            price: 320,
            status: 'ACTIVE',
            company_id: zeDelivery._id
        },
        {
            name: 'Reparo Hidráulico Comercial',
            description: 'Conserto de tubulações, bombas dágua e caixas acopladas.',
            category: 'Hidráulica',
            icon: 'water-outline',
            price: 280,
            status: 'ACTIVE',
            company_id: zeDelivery._id
        }
    ]);

    const servicesFlash = await Service.create([
        {
            name: 'Manutenção de Iluminação LED',
            description: 'Substituição de luminárias de alta performance e refletores.',
            category: 'Elétrica',
            icon: 'bulb-outline',
            price: 180,
            status: 'ACTIVE',
            company_id: flashLtda._id
        },
        {
            name: 'Desentupimento e Hidrojateamento',
            description: 'Limpeza de caixas de gordura e colunas de esgoto.',
            category: 'Hidráulica',
            icon: 'water-outline',
            price: 400,
            status: 'ACTIVE',
            company_id: flashLtda._id
        },
        {
            name: 'Reparo de Portas e Fechaduras Eletrônicas',
            description: 'Configuração e troca de eletroímãs e fechaduras digitais.',
            category: 'Serralheria',
            icon: 'key-outline',
            price: 250,
            status: 'ACTIVE',
            company_id: flashLtda._id
        }
    ]);

    await Company.findByIdAndUpdate(zeDelivery._id, { services: servicesZD.map((s) => s._id) });
    await Company.findByIdAndUpdate(flashLtda._id, { services: servicesFlash.map((s) => s._id) });
    console.log('✅ Catálogos de serviços associados às empresas.');

    // 10. ORDENS DE SERVIÇO (SOLICITAÇÕES E VISITAS OPERACIONAIS)
    const today = new Date();
    const d1 = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const d2 = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
    const d3 = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000);
    const d4 = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
    const d5 = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

    await ServiceOrder.create([
        // ZÉ DELIVERY - Vila Ré
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[0]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d1,
            current_status: 'CONCLUIDO',
            time_spent: '2.5',
            km_driven: '12',
            fuel_cost: '18',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1200 - Vila Ré',
            notes: 'Quadro elétrico revisado com sucesso.',
            timeline: [
                { status: 'AGENDADO', timestamp: d1 },
                { status: 'CONCLUIDO', timestamp: d1 }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[1]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: today,
            current_status: 'EM_EXECUCAO',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1200 - Vila Ré',
            notes: 'Troca da placa do motor em andamento.',
            timeline: [
                { status: 'AGENDADO', timestamp: today },
                { status: 'EM_EXECUCAO', timestamp: today }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[2]._id,
            scheduled_date: d4,
            current_status: 'AGENDADO',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1200 - Vila Ré',
            notes: 'Vazamento na caixa de gordura.',
            timeline: [{ status: 'AGENDADO', timestamp: d4 }]
        },

        // FLASH LTDA - Paulista
        {
            company_id: flashLtda._id,
            unit_id: paulista._id,
            service_id: servicesFlash[0]._id,
            collaborator_id: pedroTecnicoFlash._id,
            scheduled_date: d1,
            current_status: 'CONCLUIDO',
            time_spent: '1.8',
            km_driven: '8',
            fuel_cost: '12',
            zone: 'Centro',
            address_override: 'Avenida Paulista, 1000 - Bela Vista',
            notes: '12 luminárias substituídas.',
            timeline: [
                { status: 'AGENDADO', timestamp: d1 },
                { status: 'CONCLUIDO', timestamp: d1 }
            ]
        },
        {
            company_id: flashLtda._id,
            unit_id: paulista._id,
            service_id: servicesFlash[1]._id,
            collaborator_id: pedroTecnicoFlash._id,
            scheduled_date: d3,
            current_status: 'CONCLUIDO',
            time_spent: '2.2',
            km_driven: '10',
            fuel_cost: '15',
            zone: 'Centro',
            address_override: 'Avenida Paulista, 1000 - Bela Vista',
            notes: 'Coluna desentupida.',
            timeline: [
                { status: 'AGENDADO', timestamp: d3 },
                { status: 'CONCLUIDO', timestamp: d3 }
            ]
        },
        {
            company_id: flashLtda._id,
            unit_id: joaoDias._id,
            service_id: servicesFlash[2]._id,
            collaborator_id: pedroTecnicoFlash._id,
            scheduled_date: d2,
            current_status: 'CONCLUIDO',
            time_spent: '1.0',
            km_driven: '15',
            fuel_cost: '20',
            zone: 'ZS',
            address_override: 'Estrada de Itapecerica, 500 - Vila Andrade',
            notes: 'Dobradiça substituída.',
            timeline: [
                { status: 'AGENDADO', timestamp: d2 },
                { status: 'CONCLUIDO', timestamp: d2 }
            ]
        },
        {
            company_id: flashLtda._id,
            unit_id: joaoDias._id,
            service_id: servicesFlash[0]._id,
            scheduled_date: today,
            current_status: 'EM_DESLOCAMENTO',
            zone: 'ZS',
            address_override: 'Estrada de Itapecerica, 500 - Vila Andrade',
            notes: 'Lâmpadas piscando no escritório principal.',
            timeline: [
                { status: 'AGENDADO', timestamp: today },
                { status: 'EM_DESLOCAMENTO', timestamp: today }
            ]
        },

        // CUSTOMER USER ORDERS (user@user.com)
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[0]._id,
            collaborator_id: carlosTecnicoZD._id,
            user_id: customerUser._id,
            requested_by: 'Jefferson Customer (user@user.com)',
            scheduled_date: d4,
            current_status: 'AGENDADO',
            client_price: 150,
            notes: 'Troca de disjuntor principal da loja.',
            timeline: [
                { status: 'SOLICITADO', timestamp: d1, notes: 'Chamado aberto pelo cliente.' },
                { status: 'AGENDADO', timestamp: d4, notes: 'Técnico Carlos designado.' }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: itaquera._id,
            service_id: servicesZD[1]._id,
            user_id: customerUser._id,
            requested_by: 'Jefferson Customer (user@user.com)',
            scheduled_date: d5,
            current_status: 'SOLICITADO',
            client_price: 120,
            notes: 'Manutenção de portão basculante.',
            timeline: [{ status: 'SOLICITADO', timestamp: d2, notes: 'Aguardando confirmação de agenda.' }]
        }
    ]);
    console.log('✅ Ordens de Serviço operacionais criadas.');

    // 11. CENTRAL DE AJUDA
    console.log('📚 Semeando Central de Ajuda...');
    await seedHelpTopics();
    console.log('✅ Central de Ajuda semeada com sucesso!');
}

async function run() {
    try {
        console.log('🔗 Conectando ao MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB.');

        await clearDatabase();
        await seedDatabase();

        console.log('🎉 Seed finalizado com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante o seed:', error);
        process.exit(1);
    }
}

run();
