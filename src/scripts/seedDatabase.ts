import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';
import { Unit } from '../models/unit.model';
import { Service } from '../models/service.model';
import { ServiceOrder } from '../models/serviceorder.model';
import HelpCategory from '../models/HelpCategory';
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

    // 4. COLABORADORES E OPERADORES ASSOCIADOS
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

    const thiagoGlobal = await User.create({
        name: 'Thiago Global',
        email: 'thiago@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'collaborator',
        role: 'technician',
        technician_profile: {
            specialties: ['Geral', 'Elétrica'],
            is_available_now: true
        },
        company_id: null,
        phone: '11977770005',
        status: 'active'
    });

    const customerUser = await User.create({
        name: 'Jefferson Customer',
        email: 'user@user.com',
        password: hashedPassword,
        type: 'user',
        role: 'customer',
        phone: '11988887777',
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

    // 7. CENTRAL DE AJUDA (HELP TOPICS SEEDER EXPORTÁVEL)
    console.log('📚 Semeando Tópicos da Central de Ajuda...');
    const helpSeedData = [
      {
        id: 'collaborators',
        title: 'Colaboradores e Técnicos',
        icon: 'people-outline',
        order: 1,
        topics: [
          {
            id: 'collaborator-main-info',
            title: 'Dados Principais do Colaborador',
            content: [
              'O formulário de cadastro do colaborador solicita os dados essenciais de identificação do profissional de campo.',
              'Nome Completo: Nome oficial do colaborador utilizado na emissão de Ordens de Serviço (OS) e relatórios técnicos.',
              'E-mail: Endereço de e-mail exclusivo utilizado pelo colaborador para autenticação e login no aplicativo.',
              'Telefone: Número de contato telefônico/WhatsApp para notificação automática sobre agendamentos e chamados.',
              'Senha: Credencial de segurança inicial com no mínimo 6 caracteres.'
            ]
          },
          {
            id: 'collaborator-permissions',
            title: 'Permissões e Cargos do Colaborador',
            content: [
              'Define o nível de autorização operacional e o escopo de atendimento do profissional.',
              'Nível de Acesso / Cargo: Define a função (Técnico executa OS, Supervisor coordena equipes, Administrativo atua no suporte).',
              'Empresa / Vínculo: Associa o colaborador a uma empresa parceira específica ou o mantém no Atendimento Geral (Global).',
              'Especialidades: Seleção das áreas técnicas em que o profissional possui certificação (Elétrica, Hidráulica/Civil, Serralheria).',
              'Colaborador Ativo: Permite bloquear ou liberar instantaneamente o acesso do colaborador ao aplicativo.'
            ]
          },
          {
            id: 'collaborator-teams',
            title: 'Visão Geral de Equipes e Cargos',
            content: [
              'A tela de Equipes e Cargos agrega em tempo real a divisão da força de trabalho da empresa.',
              'Equipe Técnica: Profissionais alocados como Técnicos de Campo.',
              'Supervisores: Líderes operacionais com capacidade de vistoria e gestão.',
              'Administrativo: Equipe interna de suporte, recepção e agendamento de chamados.'
            ]
          }
        ]
      },
      {
        id: 'services',
        title: 'Catálogo de Serviços',
        icon: 'construct-outline',
        order: 5,
        topics: [
          {
            id: 'service-data',
            title: 'Dados e Precificação do Serviço',
            content: [
              'Informações essenciais de identificação e valor comercial do serviço prestado.',
              'Nome do Serviço: Título exibido no aplicativo do cliente e nas Ordens de Serviço.',
              'Descrição: Detalhes do escopo e atividades incluídas no atendimento.',
              'Preço Base (R$): Valor inicial/padrão cobrado pela execução.',
              'Categoria / Especialidade: Área técnica (Elétrica, Hidráulica/Civil, Serralheria, Geral), utilizada no filtro de alocação de técnicos.'
            ]
          },
          {
            id: 'service-appearance',
            title: 'Aparência Visual e Disponibilidade',
            content: [
              'Configurações visuais e de agendamento do serviço.',
              'Ícone no App: Representação gráfica do serviço nos cards do aplicativo e catálogo.',
              'Serviço Ativo: Alterna a disponibilidade para novos agendamentos no sistema.'
            ]
          }
        ]
      },
      {
        id: 'staff',
        title: 'Usuários Globais e Permissões',
        icon: 'person-add-outline',
        order: 2,
        topics: [
          {
            id: 'staff-main-info',
            title: 'Dados de Identidade do Usuário',
            content: [
              'Cadastro das informações primárias de qualquer perfil de acesso ao ecossistema Bravo.',
              'Nome Completo: Nome do usuário responsável pela conta.',
              'E-mail: E-mail de credencial para realizar login nos painéis administrativos ou cliente.',
              'Telefone: Número de contato direto do usuário.'
            ]
          },
          {
            id: 'staff-permissions',
            title: 'Credenciais, Níveis de Acesso e Módulos',
            content: [
              'Definição das chaves de segurança e escopo de navegação no painel.',
              'Nível de Acesso: Define o papel do usuário no sistema (Super Admin, Dono de Empresa, Operador, Técnico de Campo, Cliente B2C).',
              'Empresa Associada: Associa a conta ao tenant da empresa correspondente.',
              'Módulos Liberados: Permissões granuladas de acesso aos menus (Empresas, Catálogo, Usuários, etc.).'
            ]
          }
        ]
      },
      {
        id: 'agenda-service-orders',
        title: 'Agenda 365 e Status de OS',
        icon: 'calendar-number-outline',
        order: 3,
        topics: [
          {
            id: 'agenda-visual-flow',
            title: 'Navegação e Visualizações da Agenda 365',
            content: [
              'A Agenda 365 oferece controle operacional consolidado em tempo real das Ordens de Serviço (OS).',
              'Visualização Mensal: Exibe a lista de chamados de cada dia com horário de início e status codificado em cores.',
              'Visualização Semanal / Diária: Permite acompanhar a grade horária detalhada de cada serviço com técnico e unidade alocados.',
              'Acesso Direto à OS: Ao clicar em qualquer evento do calendário, você é redirecionado instantaneamente para a tela de detalhes e ações da OS.'
            ]
          },
          {
            id: 'agenda-status-colors',
            title: 'Guia de Cores e Status das Ordens de Serviço',
            content: [
              '🔵 Agendado (Azul): A Ordem de Serviço foi confirmada e agendada para a data e horário estipulados.',
              '🟣 Técnico a Caminho (Roxo / Ciano): O técnico iniciou o deslocamento até a unidade de atendimento.',
              '🟡 Técnico no Local / Em Execução (Amarelo / Âmbar): Check-in presencial realizado e serviço em execução.',
              '🔵 Aguardando Assinatura (Azul Claro): Manutenção concluída, aguardando assinatura do responsável na unidade.',
              '🟢 Concluído (Verde): Ordem de serviço finalizada e assinada com sucesso.',
              '🔴 Cancelado / Recusado (Vermelho): Atendimento cancelado ou impedido por restrições técnicas.',
              'Lembretes Automáticos: O sistema emite notificações preventivas (Push e E-mail) com registro em trilha de auditoria prévia da execução.'
            ]
          }
        ]
      }
    ];

    for (const catData of helpSeedData) {
      await HelpCategory.create(catData);
    }
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
