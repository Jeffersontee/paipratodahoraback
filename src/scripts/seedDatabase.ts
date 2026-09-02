import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';
import { Unit } from '../models/unit.model';
import { Service } from '../models/service.model';
import { ServiceOrder } from '../models/serviceorder.model';
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
    console.log('✅ Coleções limpas.');
}

async function seedDatabase() {
    console.log('🌱 Iniciando sementeira rica do Bravo DB...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Bravo@25', salt);

    // 1. USUÁRIOS GLOBAIS (STAFF DO SISTEMA)
    const superAdmin = await User.create({
        name: 'Super Admin',
        email: 'admin@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_admin',
        status: 'active'
    });

    const superSupervisor = await User.create({
        name: 'Carlos Supervisor Geral',
        email: 'supervisor@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_staff',
        status: 'active',
        role: 'Supervisor'
    });

    const superOperator = await User.create({
        name: 'Luciana Operadora Geral',
        email: 'operador@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'super_staff',
        status: 'active',
        role: 'Operador'
    });
    console.log('✅ Usuários globais (Staff) criados.');

    // 2. EMPRESAS PARCEIRAS (COMPANIES)
    const zeDelivery = await Company.create({
        name: 'Zé Delivery',
        cnpj: '12.345.678/0001-99',
        status: 'ACTIVE',
        subscription_status: 'active'
    });

    const flashLtda = await Company.create({
        name: 'Flash Ltda',
        cnpj: '00.000.000/0000-50',
        status: 'ACTIVE',
        subscription_status: 'active'
    });

    const ambev = await Company.create({
        name: 'Ambev Distribuidora',
        cnpj: '99.999.999/0001-22',
        status: 'ACTIVE',
        subscription_status: 'trialing'
    });
    console.log('✅ Empresas (Zé Delivery, Flash, Ambev) criadas.');

    // 3. PROPRIETÁRIOS DE EMPRESAS (COMPANY OWNERS)
    const joaoOwner = await User.create({
        name: 'João Proprietário (Zé Delivery)',
        email: 'joao@zedelivery.com',
        password: hashedPassword,
        type: 'company_owner',
        company_id: zeDelivery._id,
        status: 'active'
    });

    const barryOwner = await User.create({
        name: 'Barry Allen (Flash)',
        email: 'barry@flash.com',
        password: hashedPassword,
        type: 'company_owner',
        company_id: flashLtda._id,
        status: 'active'
    });

    const ambevOwner = await User.create({
        name: 'Diretoria Ambev',
        email: 'diretor@ambev.com',
        password: hashedPassword,
        type: 'company_owner',
        company_id: ambev._id,
        status: 'active'
    });
    console.log('✅ Proprietários de empresas criados.');

    // 4. COLABORADORES (TÉCNICOS E SUPERVISORES ASSOCIADOS)
    const carlosTecnicoZD = await User.create({
        name: 'Carlos Técnico',
        email: 'carlos@zedelivery.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'Técnico de Campo',
        company_id: zeDelivery._id,
        status: 'active'
    });

    const lucasSupervisorZD = await User.create({
        name: 'Lucas Supervisor ZD',
        email: 'lucas@zedelivery.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'Supervisor',
        company_id: zeDelivery._id,
        status: 'active'
    });

    const pedroTecnicoFlash = await User.create({
        name: 'Pedro Técnico Flash',
        email: 'pedro@flash.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'Técnico de Campo',
        company_id: flashLtda._id,
        status: 'active'
    });

    const anaOperadoraFlash = await User.create({
        name: 'Ana Operadora Flash',
        email: 'ana@flash.com',
        password: hashedPassword,
        type: 'collaborator',
        role: 'Operador',
        company_id: flashLtda._id,
        status: 'active'
    });

    const thiagoGlobal = await User.create({
        name: 'Thiago Global',
        email: 'thiago@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'collaborator',
        role: 'Técnico de Campo',
        company_id: null,
        status: 'active'
    });

    const customerUser = await User.create({
        name: 'Jefferson Customer',
        email: 'user@user.com',
        password: hashedPassword,
        type: 'user',
        status: 'active'
    });
    console.log('✅ Colaboradores e Cliente (user@user.com) criados.');

    // 5. UNIDADES / FILIAIS (UNITS COM DADOS DE CONTATO E CNPJ)
    const VilaRe = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Vila Ré',
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
        follower_ids: [carlosTecnicoZD._id]
    });

    const itaquera = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Itaquera',
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
        follower_ids: [carlosTecnicoZD._id]
    });

    const pinheiros = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Pinheiros',
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
        follower_ids: [carlosTecnicoZD._id]
    });

    const paulista = await Unit.create({
        company_id: flashLtda._id,
        name: 'Paulista',
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
        manager_id: barryOwner._id,
        follower_ids: [pedroTecnicoFlash._id]
    });

    const joaoDias = await Unit.create({
        company_id: flashLtda._id,
        name: 'João Dias',
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
        manager_id: barryOwner._id,
        follower_ids: [pedroTecnicoFlash._id]
    });
    console.log('✅ Unidades operacionais e filiais criadas.');

    // 6. SERVIÇOS DO CATÁLOGO POR EMPRESA
    const servicesZD = await Service.insertMany([
        {
            company_id: zeDelivery._id,
            name: 'Manutenção de Quadro Elétrico',
            category: 'ELÉTRICA',
            price: 150.0,
            icon: 'flash-outline',
            description: 'Revisão e aperto técnico'
        },
        {
            company_id: zeDelivery._id,
            name: 'Reparo em Vazamentos',
            category: 'HIDRÁULICA/CIVIL',
            price: 200.0,
            icon: 'water-outline',
            description: 'Reparo de vazamento hidráulico'
        },
        {
            company_id: zeDelivery._id,
            name: 'Manutenção de Portões',
            category: 'SERRALHERIA',
            price: 300.0,
            icon: 'build-outline',
            description: 'Lubrificação e soldas'
        }
    ]);

    const servicesFlash = await Service.insertMany([
        {
            company_id: flashLtda._id,
            name: 'Instalação de Disjuntor NEMA',
            category: 'ELÉTRICA',
            price: 120.0,
            icon: 'flash-outline',
            description: 'Instalação padrão'
        },
        {
            company_id: flashLtda._id,
            name: 'Desobstrução Sanitária',
            category: 'HIDRÁULICA/CIVIL',
            price: 180.0,
            icon: 'water-outline',
            description: 'Limpeza de tubulações'
        },
        {
            company_id: flashLtda._id,
            name: 'Troca de Dobradiça Metálica',
            category: 'SERRALHERIA',
            price: 90.0,
            icon: 'key-outline',
            description: 'Ajuste de portas'
        }
    ]);
    console.log('✅ Serviços das empresas cadastrados.');

    // 7. HISTÓRICO DE VISITAS E SOLICITAÇÕES (SERVICE ORDERS)
    const today = new Date();

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

        // ZÉ DELIVERY - Itaquera
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
            unit_id: itaquera._id,
            service_id: servicesZD[1]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d4,
            current_status: 'CONCLUIDO',
            time_spent: '2.5',
            km_driven: '24',
            fuel_cost: '32',
            zone: 'ZL',
            address_override: 'Av. Itaquera, 5000 - Itaquera',
            notes: 'Troca de encanamento trincado.',
            timeline: [
                { status: 'AGENDADO', timestamp: d4 },
                { status: 'CONCLUIDO', timestamp: d4 }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: itaquera._id,
            service_id: servicesZD[2]._id,
            scheduled_date: d6,
            current_status: 'AGENDADO',
            zone: 'ZL',
            address_override: 'Av. Itaquera, 5000 - Itaquera',
            notes: 'Revisão do portão automático da garagem.',
            timeline: [{ status: 'AGENDADO', timestamp: d6 }]
        },
        // Mais dados espalhados em 2026 para ZE DELIVERY
        {
            company_id: zeDelivery._id,
            unit_id: VilaRe._id,
            service_id: servicesZD[0]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d7,
            current_status: 'AGENDADO',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1000 - Vila Ré',
            notes: 'Revisão agendada.',
            timeline: [{ status: 'AGENDADO', timestamp: d7 }]
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
            notes: 'Vazamento crônico.',
            timeline: [{ status: 'AGENDADO', timestamp: d8 }]
        },
        {
            company_id: zeDelivery._id,
            unit_id: pinheiros._id,
            service_id: servicesZD[2]._id,
            collaborator_id: carlosTecnicoZD._id,
            scheduled_date: d10,
            current_status: 'AGENDADO',
            zone: 'ZO',
            address_override: 'Rua dos Pinheiros, 450 - Pinheiros',
            notes: 'Portão quebrado.',
            timeline: [{ status: 'AGENDADO', timestamp: d10 }]
        },
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

        // FLASH LTDA - João Dias
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
            scheduled_date: d11,
            current_status: 'AGENDADO',
            zone: 'Centro',
            address_override: 'Avenida Paulista, 1000 - Bela Vista',
            notes: 'Fechadura danificada.',
            timeline: [{ status: 'AGENDADO', timestamp: d11 }]
        },
        {
            company_id: flashLtda._id,
            unit_id: joaoDias._id,
            service_id: servicesFlash[1]._id,
            scheduled_date: d12,
            current_status: 'AGENDADO',
            zone: 'ZS',
            address_override: 'Estrada de Itapecerica, 500 - Vila Andrade',
            notes: 'Ralo entupido.',
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

    console.log('✅ Solicitações de serviço (Visitas) criadas com dados ricos para gráficos.');
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
