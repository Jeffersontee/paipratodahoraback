import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';
import { Unit } from '../models/Unit.model';
import { Service } from '../models/Service.model';
import { ServiceOrder } from '../models/ServiceOrder.model';
import bcrypt from 'bcrypt';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bravo-instalacoes';

async function clearDatabase() {
    console.log('🧹 Limpando coleções...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Unit.deleteMany({});
    await Service.deleteMany({});
    await ServiceOrder.deleteMany({});
    console.log('✅ Coleções limpas.');
}

async function seedDatabase() {
    console.log('🌱 Iniciando Seed do Banco de Dados...');

    // 1. Criar Super Admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    
    const superAdmin = await User.create({
        name: 'Super Admin',
        email: 'admin@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'SUPER_ADMIN_TYPE',
        status: 'ACTIVE'
    });
    console.log('✅ Super Admin criado.');

    // 2. Criar Empresa Zé Delivery
    const zeDelivery = await Company.create({
        name: 'Zé Delivery',
        cnpj: '12.345.678/0001-99',
        status: 'ACTIVE',
        subscription_status: 'active'
    });
    console.log('✅ Empresa Zé Delivery criada.');

    // 3. Criar Serviços da Empresa
    const services = await Service.insertMany([
        { company_id: zeDelivery._id, name: 'Manutenção de Quadro Elétrico', category: 'ELÉTRICA', price: 150.00, icon: 'flash-outline', description: 'Revisão completa' },
        { company_id: zeDelivery._id, name: 'Troca de Disjuntores', category: 'ELÉTRICA', price: 80.00, icon: 'flash-outline', description: 'Troca de disjuntor' },
        { company_id: zeDelivery._id, name: 'Reparo em Vazamentos', category: 'HIDRÁULICA/CIVIL', price: 200.00, icon: 'water-outline', description: 'Infiltração e vazamento' },
        { company_id: zeDelivery._id, name: 'Desentupimento', category: 'HIDRÁULICA/CIVIL', price: 250.00, icon: 'water-outline', description: 'Pia e ralo' },
        { company_id: zeDelivery._id, name: 'Manutenção de Portões', category: 'SERRALHERIA', price: 300.00, icon: 'build-outline', description: 'Solda e dobradiça' },
        { company_id: zeDelivery._id, name: 'Troca de Fechadura', category: 'SERRALHERIA', price: 90.00, icon: 'key-outline', description: 'Instalação de fechadura' }
    ]);
    console.log(`✅ ${services.length} Serviços criados.`);

    // 4. Criar Colaboradores (Gerentes e Técnicos)
    const joaoGerente = await User.create({
        name: 'João Gerente (Zé Delivery)',
        email: 'joao@zedelivery.com',
        password: hashedPassword,
        type: 'COMPANY_ADMIN_TYPE',
        company_id: zeDelivery._id,
        status: 'ACTIVE'
    });
    
    const carlosTecnico = await User.create({
        name: 'Carlos Técnico',
        email: 'carlos@bravoinstalacoes.com.br',
        password: hashedPassword,
        type: 'COLLABORATOR_TYPE',
        status: 'ACTIVE'
    });
    console.log('✅ Colaboradores criados.');

    // 5. Criar Unidades
    const vilaRe = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Vila Ré',
        address: {
            street: 'Rua Itinguçu',
            number: '1000',
            neighborhood: 'Vila Ré',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '03658-010'
        },
        manager_id: joaoGerente._id,
        follower_ids: [carlosTecnico._id]
    });

    const itaquera = await Unit.create({
        company_id: zeDelivery._id,
        name: 'Itaquera',
        address: {
            street: 'Av. Itaquera',
            number: '5000',
            neighborhood: 'Itaquera',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '08295-000'
        },
        manager_id: joaoGerente._id,
        follower_ids: [carlosTecnico._id]
    });
    console.log('✅ Unidades (Vila Ré e Itaquera) criadas.');

    // 6. Criar Visitas (Service Orders)
    // Uma concluída no mês atual, uma pendente
    
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    await ServiceOrder.insertMany([
        {
            company_id: zeDelivery._id,
            unit_id: vilaRe._id,
            service_id: services[0]._id, // Quadro Elétrico
            collaborator_id: carlosTecnico._id,
            scheduled_date: lastWeek,
            current_status: 'CONCLUIDO',
            time_spent: '2,5',
            km_driven: '15',
            fuel_cost: '20',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1000 - São Paulo/SP',
            notes: 'Quadro elétrico revisado e disjuntores substituídos com sucesso.',
            observations: 'Tudo OK. Sem pendências.',
            timeline: [
                { status: 'AGENDADO', timestamp: new Date(lastWeek.getTime() - 86400000) },
                { status: 'CONCLUIDO', timestamp: lastWeek }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: itaquera._id,
            service_id: services[2]._id, // Vazamentos
            collaborator_id: carlosTecnico._id,
            scheduled_date: tomorrow,
            current_status: 'AGENDADO',
            time_spent: '',
            km_driven: '',
            fuel_cost: '',
            zone: 'ZL',
            address_override: 'Av. Itaquera, 5000 - São Paulo/SP',
            notes: '',
            observations: 'Vazamento no banheiro masculino.',
            timeline: [
                { status: 'AGENDADO', timestamp: today }
            ]
        },
        {
            company_id: zeDelivery._id,
            unit_id: vilaRe._id,
            service_id: services[4]._id, // Manutenção Portões
            scheduled_date: today,
            current_status: 'EM_DESLOCAMENTO',
            time_spent: '',
            km_driven: '',
            fuel_cost: '',
            zone: 'ZL',
            address_override: 'Rua Itinguçu, 1000 - São Paulo/SP',
            notes: 'Portão não está abrindo.',
            observations: 'Verificar motor.',
            timeline: [
                { status: 'AGENDADO', timestamp: new Date(today.getTime() - 3600000) },
                { status: 'EM_DESLOCAMENTO', timestamp: today }
            ]
        }
    ]);
    console.log('✅ Solicitações de Serviço (Visitas) criadas.');
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
