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
import { initBravoBase } from './InitialBravoDb';
import { getEnvironmentVariables } from '../environments/enviroment';

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

async function seedTestEnvironment() {
    console.log('🌱 Iniciando sementeira rica de TESTES & DESENVOLVIMENTO para o Bravo DB...');

    // 1. INICIALIZA A ESTRUTURA BASE DA APLICAÇÃO (Super Admin, Planos, Catálogo Global, Central de Ajuda)
    const { plans, hashedPassword } = await initBravoBase();
    const { planTrial, planPro, planPremium } = plans;

    // 2. EMPRESAS PARCEIRAS (COMPANIES)
    console.log('🏢 Semeando Empresas Parceiras de Teste (Flash, Zé Delivery, Ambev)...');
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
    console.log('✅ Empresas criadas.');

    // 3. ASSINATURAS SAAS DAS EMPRESAS (SUBSCRIPTIONS)
    console.log('💳 Semeando Assinaturas SaaS das Empresas...');
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
    console.log('✅ Assinaturas SaaS criadas.');

    // 4. HISTÓRICO DE FATURAS MENSAIS (INVOICES - PARA GRÁFICOS E COBRANÇA)
    console.log('💰 Semeando Histórico de Faturas...');
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const invoiceDocs: any[] = [];

    // Faturas históricas pagas para Flash Ltda
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

    // Fatura pendente do mês atual para Flash Ltda
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
    console.log(`✅ ${invoiceDocs.length} Faturas mensais semeadas.`);

    // 5. PROPRIETÁRIOS DAS EMPRESAS (COMPANY OWNERS)
    console.log('👤 Semeando Proprietários e Equipe das Empresas...');
    const joaoOwner = await User.create({
        name: 'João Proprietário (Zé Delivery)',
        email: 'joao@zedelivery.com',
        password: hashedPassword,
        type: 'company_owner',
        role: 'owner',
        company_id: zeDelivery._id,
        phone: '11988880001',
        status: 'active',
        email_verified: true
    });

    const barryOwner = await User.create({
        name: 'Barry Allen (Flash)',
        email: 'barry@flash.com',
        password: hashedPassword,
        type: 'company_owner',
        role: 'owner',
        company_id: flashLtda._id,
        phone: '11988880002',
        status: 'active',
        email_verified: true
    });

    const ambevOwner = await User.create({
        name: 'Diretoria Ambev',
        email: 'diretor@ambev.com',
        password: hashedPassword,
        type: 'company_owner',
        role: 'owner',
        company_id: ambev._id,
        phone: '11988880003',
        status: 'active',
        email_verified: true
    });

    // 6. GERENTES, ATENDENTES E TÉCNICOS ASSOCIADOS
    const gestorFlash = await User.create({
        name: 'Gestor Flash',
        email: 'gestor@teste.com',
        password: hashedPassword,
        type: 'admin',
        role: 'manager',
        company_id: flashLtda._id,
        phone: '11977770008',
        status: 'active',
        email_verified: true
    });

    const anaOperadoraFlash = await User.create({
        name: 'Ana Operadora Flash',
        email: 'ana@flash.com',
        password: hashedPassword,
        type: 'admin',
        role: 'backoffice',
        company_id: flashLtda._id,
        phone: '11977770004',
        status: 'active',
        email_verified: true
    });

    const pedroTecnicoFlash = await User.create({
        name: 'Pedro Técnico Flash',
        email: 'pedro@flash.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'technician',
        technician_profile: {
            specialties: ['Hidráulica', 'CFTV', 'Serralheria'],
            is_available_now: true
        },
        company_id: flashLtda._id,
        phone: '11977770003',
        status: 'active',
        email_verified: true
    });

    const carlosTecnicoZD = await User.create({
        name: 'Carlos Técnico ZD',
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
        status: 'active',
        email_verified: true
    });

    const lucasSupervisorZD = await User.create({
        name: 'Lucas Supervisor ZD',
        email: 'lucas@zedelivery.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'supervisor',
        company_id: zeDelivery._id,
        phone: '11977770002',
        status: 'active',
        email_verified: true
    });

    const customerUser = await User.create({
        name: 'Jefferson Customer',
        email: 'user@user.com',
        password: hashedPassword,
        type: 'user',
        role: 'customer',
        phone: '11988887777',
        status: 'active',
        email_verified: true
    });
    console.log('✅ Usuários de empresas e cliente final criados.');

    // 7. UNIDADES / FILIAIS (UNITS COM GERENTES E ACOMPANHANTES ATRIBUÍDOS)
    console.log('📍 Semeando Filiais e Unidades Operacionais...');
    const VilaRe = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Unidade Vila Ré',
        cnpj: '12.345.678/0002-88',
        short_name: 'ZD-VR',
        phone: '(11) 98888-7777',
        email: 'vilare@zedelivery.com',
        address: {
            street: 'Rua Itinguçu',
            number: '1000',
            neighborhood: 'Vila Ré',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '03658-010'
        },
        manager_id: joaoOwner._id,
        follower_ids: [carlosTecnicoZD._id],
        status: 'ACTIVE'
    });

    const itaquera = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Unidade Itaquera',
        cnpj: '12.345.678/0003-77',
        short_name: 'ZD-IT',
        phone: '(11) 96666-5555',
        email: 'itaquera@zedelivery.com',
        address: {
            street: 'Av. Itaquera',
            number: '5000',
            neighborhood: 'Itaquera',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '08295-000'
        },
        manager_id: joaoOwner._id,
        follower_ids: [carlosTecnicoZD._id],
        status: 'ACTIVE'
    });

    const pinheiros = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Unidade Pinheiros',
        cnpj: '12.345.678/0004-66',
        short_name: 'ZD-PI',
        phone: '(11) 94444-3333',
        email: 'pinheiros@zedelivery.com',
        address: {
            street: 'Rua dos Pinheiros',
            number: '450',
            neighborhood: 'Pinheiros',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '05422-000'
        },
        manager_id: joaoOwner._id,
        follower_ids: [carlosTecnicoZD._id],
        status: 'ACTIVE'
    });

    const paulista = await Unit.create({
        company_id: flashLtda._id,
        name: 'Unidade Paulista',
        cnpj: '00.000.000/0002-40',
        short_name: 'FL-PA',
        phone: '(11) 91111-2222',
        email: 'paulista@flash.com.br',
        address: {
            street: 'Avenida Paulista',
            number: '1000',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '01310-100'
        },
        manager_id: gestorFlash._id,
        follower_ids: [anaOperadoraFlash._id, pedroTecnicoFlash._id],
        status: 'ACTIVE'
    });

    const joaoDias = await Unit.create({
        company_id: flashLtda._id,
        name: 'Unidade João Dias',
        cnpj: '00.000.000/0003-30',
        short_name: 'FL-JD',
        phone: '(11) 92222-3333',
        email: 'joaodias@flash.com.br',
        address: {
            street: 'Estrada de Itapecerica',
            number: '500',
            neighborhood: 'Vila Andrade',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '05858-000'
        },
        manager_id: gestorFlash._id,
        follower_ids: [anaOperadoraFlash._id],
        status: 'ACTIVE'
    });
    console.log('✅ Unidades e filiais com gestores e acompanhantes criadas.');

    // 8. SERVIÇOS DO CATÁLOGO ESPECÍFICOS POR EMPRESA
    console.log('🛠️ Semeando Catálogo de Serviços por Empresa...');
    const servicesZD = await Service.insertMany([
        {
            company_id: zeDelivery._id,
            name: 'Manutenção de Quadro Elétrico',
            category: 'Elétrica',
            price: 150.0,
            icon: 'flash-outline',
            description: 'Revisão geral e reaperto técnico de disjuntores.',
            status: 'ACTIVE'
        },
        {
            company_id: zeDelivery._id,
            name: 'Reparo em Vazamentos Hidráulicos',
            category: 'Hidráulica',
            price: 200.0,
            icon: 'water-outline',
            description: 'Detecção e conserto de vazamentos em tubulações e caixas.',
            status: 'ACTIVE'
        },
        {
            company_id: zeDelivery._id,
            name: 'Manutenção de Portões Automáticos',
            category: 'Serralheria',
            price: 300.0,
            icon: 'construct-outline',
            description: 'Troca de cremalheiras, regulagem e lubrificação.',
            status: 'ACTIVE'
        }
    ]);

    const servicesFlash = await Service.insertMany([
        {
            company_id: flashLtda._id,
            name: 'Instalação de Disjuntor NEMA/DIN',
            category: 'Elétrica',
            price: 120.0,
            icon: 'flash-outline',
            description: 'Instalação e substituição padrão de disjuntores.',
            status: 'ACTIVE'
        },
        {
            company_id: flashLtda._id,
            name: 'Desobstrução Sanitária e Hidrojateamento',
            category: 'Hidráulica',
            price: 180.0,
            icon: 'water-outline',
            description: 'Limpeza de colunas e tubulações principais.',
            status: 'ACTIVE'
        },
        {
            company_id: flashLtda._id,
            name: 'Troca de Fechadura e Dobradiça Metálica',
            category: 'Serralheria',
            price: 90.0,
            icon: 'key-outline',
            description: 'Ajuste de portas blindadas e fechaduras digitais.',
            status: 'ACTIVE'
        }
    ]);

    await Company.findByIdAndUpdate(zeDelivery._id, { services: servicesZD.map((s) => s._id) });
    await Company.findByIdAndUpdate(flashLtda._id, { services: servicesFlash.map((s) => s._id) });
    console.log('✅ Catálogos específicos vinculados às empresas.');

    // 9. HISTÓRICO DE ORDENS DE SERVIÇO (SERVICE ORDERS & AGENDA 365)
    console.log('📅 Semeando Ordens de Serviço operacionais para a Agenda 365 e KPIs...');
    const d1 = new Date('2026-01-15T10:00:00Z');
    const d2 = new Date('2026-02-10T14:00:00Z');
    const d3 = new Date('2026-03-22T09:00:00Z');
    const d4 = new Date('2026-04-05T13:30:00Z');
    const d5 = new Date('2026-05-18T16:00:00Z');
    const d6 = new Date('2026-06-20T10:00:00Z');
    const d7 = new Date('2026-07-12T11:00:00Z');
    const d8 = new Date('2026-08-01T08:00:00Z');
    const d9 = new Date('2026-09-10T15:00:00Z');
    const d10 = new Date('2026-10-25T14:00:00Z');
    const d11 = new Date('2026-11-05T09:00:00Z');
    const d12 = new Date('2026-12-18T16:00:00Z');

    await ServiceOrder.insertMany([
        // ZÉ DELIVERY - Vila Ré
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[0]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d1,
            current_status: 'CONCLUIDO',
            time_spent: '2.0',
            km_driven: '18',
            fuel_cost: '24',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1000 - Vila Ré',
            notes: 'Quadro elétrico revisado.',
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
            scheduled_date: d3,
            current_status: 'CONCLUIDO',
            time_spent: '1.5',
            km_driven: '12',
            fuel_cost: '16',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1000 - Vila Ré',
            notes: 'Vazamento da pia da copa consertado.',
            timeline: [
                { status: 'AGENDADO', timestamp: d3 },
                { status: 'CONCLUIDO', timestamp: d3 }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[2]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d5,
            current_status: 'CONCLUIDO',
            time_spent: '3.0',
            km_driven: '20',
            fuel_cost: '30',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1000 - Vila Ré',
            notes: 'Motor do portão reinstalado.',
            timeline: [
                { status: 'AGENDADO', timestamp: d5 },
                { status: 'CONCLUIDO', timestamp: d5 }
            ]
        },

        // ZÉ DELIVERY - Itaquera & Pinheiros
        {
            company_id: zeDelivery._id,
            unit_id: itaquera._id,
            service_id: servicesZD[0]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d2,
            current_status: 'CONCLUIDO',
            time_spent: '1.8',
            km_driven: '25',
            fuel_cost: '35',
            zone: 'ZL',
            address_override: 'Av. Itaquera, 5000 - Itaquera',
            notes: 'Reaperto de disjuntores.',
            timeline: [
                { status: 'AGENDADO', timestamp: d2 },
                { status: 'CONCLUIDO', timestamp: d2 }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: pinheiros._id,
            service_id: servicesZD[1]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d8,
            current_status: 'AGENDADO',
            zone: 'ZO',
            address_override: 'Rua dos Pinheiros, 450 - Pinheiros',
            notes: 'Vazamento crônico na copa.',
            timeline: [{ status: 'AGENDADO', timestamp: d8 }]
        },

        // FLASH LTDA - Paulista & João Dias
        {
            company_id: flashLtda._id,
            unit_id: paulista._id,
            service_id: servicesFlash[0]._id,
            collaborator_id: pedroTecnicoFlash._id,
            scheduled_date: d1,
            current_status: 'CONCLUIDO',
            time_spent: '1.2',
            km_driven: '8',
            fuel_cost: '10',
            zone: 'Centro',
            address_override: 'Avenida Paulista, 1000 - Bela Vista',
            notes: 'Disjuntor instalado.',
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
            collaborator_id: pedroTecnicoFlash._id,
            scheduled_date: d9,
            current_status: 'EM_DESLOCAMENTO',
            zone: 'ZS',
            address_override: 'Estrada de Itapecerica, 500 - Vila Andrade',
            notes: 'Lâmpadas piscando no escritório principal.',
            timeline: [
                { status: 'AGENDADO', timestamp: d9 },
                { status: 'EM_DESLOCAMENTO', timestamp: d9 }
            ]
        },
        {
            company_id: flashLtda._id,
            unit_id: paulista._id,
            service_id: servicesFlash[2]._id,
            collaborator_id: pedroTecnicoFlash._id,
            scheduled_date: d11,
            current_status: 'AGENDADO',
            zone: 'Centro',
            address_override: 'Avenida Paulista, 1000 - Bela Vista',
            notes: 'Fechadura eletrônica travada.',
            timeline: [{ status: 'AGENDADO', timestamp: d11 }]
        },
        {
            company_id: flashLtda._id,
            unit_id: joaoDias._id,
            service_id: servicesFlash[1]._id,
            collaborator_id: pedroTecnicoFlash._id,
            scheduled_date: d12,
            current_status: 'AGENDADO',
            zone: 'ZS',
            address_override: 'Estrada de Itapecerica, 500 - Vila Andrade',
            notes: 'Ralo entupido no sanitário dos funcionários.',
            timeline: [{ status: 'AGENDADO', timestamp: d12 }]
        },

        // CUSTOMER USER ORDERS (user@user.com)
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[0]._id,
            collaborator_id: carlosTecnicoZD._id,
            user_id: customerUser._id,
            requested_by: 'Jefferson Customer (user@user.com)',
            scheduled_date: d7,
            current_status: 'AGENDADO',
            client_price: 150,
            notes: 'Troca de disjuntor principal da loja.',
            timeline: [
                { status: 'SOLICITADO', timestamp: d6, notes: 'Chamado aberto pelo cliente.' },
                { status: 'AGENDADO', timestamp: d7, notes: 'Técnico Carlos designado.' }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: itaquera._id,
            service_id: servicesZD[1]._id,
            user_id: customerUser._id,
            requested_by: 'Jefferson Customer (user@user.com)',
            scheduled_date: d10,
            current_status: 'SOLICITADO',
            client_price: 120,
            notes: 'Manutenção de portão basculante.',
            timeline: [
                { status: 'SOLICITADO', timestamp: d10, notes: 'Aguardando confirmação de agenda.' }
            ]
        }
    ]);
    console.log('✅ Ordens de Serviço semeadas.');
}

async function run() {
    try {
        console.log('🔗 Conectando ao MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB.');

        await clearDatabase();
        await seedTestEnvironment();

        console.log('🎉 Sementeira de teste e desenvolvimento finalizada com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante o seed de teste:', error);
        process.exit(1);
    }
}

run();
