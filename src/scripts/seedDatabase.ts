// import * as dotenv from 'dotenv';
// dotenv.config();

// import * as mongoose from 'mongoose';
// import User from '../models/User';
// import Company from '../models/Company';
// import City from '../models/City';
// import Plan from '../models/Plan';
// import Category from '../models/Category';
// import Item from '../models/Item';
// import Product from '../models/Product';
// import ProductType from '../models/ProductType';
// import ProductSize from '../models/ProductSize';
// import Order from '../models/Order';
// import Invoice from '../models/Invoice';
// import Banner from '../models/Banner';
// import SaaSAudit from '../models/Audit';
// import Subscription from '../models/Subscription';
// import GlobalOrder from '../models/GlobalOrder';
// import ProductObservation from '../models/ProductObservation';
// import { Plans } from '../enums/Plans';
// import { StockService } from '../services/stock/StockService';
// import { Utils } from '../utils/Utils';
// import { AnalyticController } from '../controllers/AnalyticController';
// import { AuditController } from '../controllers/AuditController';
// //import { TenantManager } from '../utils/TenantManager';
// import { getEnvironmentVariables } from '../environments/enviroment';

// mongoose.set('strictQuery', false);

// async function seed() {
//     const env = process.env.NODE_ENV || 'development';

//     // Segurança para Produção
//     if (env === 'production' && process.env.FORCE_SEED !== 'true') {
//         console.error('\n❌ [ERRO DE SEGURANÇA]:');
//         console.error('Você está tentando rodar o SEED em ambiente de PRODUÇÃO.');
//         console.error('Para confirmar, defina a variável de ambiente FORCE_SEED=true');
//         console.error('Ex: FORCE_SEED=true npm run db:seed\n');
//         process.exit(1);
//     }

//     // Pega o número de estabelecimentos dos argumentos (ex: npm run db:seed 5) ou usa 4 como padrão
//     const count = parseInt(process.argv[2]) || 4;

//     Utils.dotenvConfigs();
//     const dbUri = getEnvironmentVariables().db_uri || process.env.DB_URI || process.env.MONGODB_URI;

//     console.log(`⚠️  Executando em modo: [${env.toUpperCase()}]`);

//     if (!dbUri) {
//         console.error('❌ Erro: DB_URI não encontrada.');
//         process.exit(1);
//     }

//     try {
//         await mongoose.connect(dbUri);
//         console.log(`🚀 Iniciando Seed de ${count} estabelecimentos no HubDB...`);

//         const password = await Utils.encryptPassword('Adega@25');
//         const defaultCity = await City.findOne({ name: 'São Paulo' });
//         const trialPlan = await Plan.findOne({ name: Plans.TRIAL });
//         const litePlan = await Plan.findOne({ name: Plans.LITE });
//         const proPlan = await Plan.findOne({ name: Plans.PRO });
//         const premiumPlan = await Plan.findOne({ name: Plans.PREMIUM });

//         // 0. Limpeza seletiva para evitar poluição no ambiente de desenvolvimento
//         console.log('🧹 Limpando dados de auditoria e ordens globais antigos...');
//         await SaaSAudit.deleteMany({ module: { $in: ['AUTH', 'SYSTEM', 'SECURITY'] } });
//         await GlobalOrder.deleteMany({});

//         // Limpa estabelecimentos de seeds anteriores para evitar erro de Duplicated Key
//         await Company.deleteMany({
//             $or: [{ res_name: new RegExp('Adega Seed', 'i') }, { db_name: new RegExp('churn_history_', 'i') }]
//         });

//         // 1. Gerar Logs de Auditoria para o Dashboard (Gráfico de Tokens e Logs Críticos)
//         console.log('📋 Gerando logs de auditoria e renovações de token...');
//         const auditLogs = [];
//         const today = new Date();

//         const modules = ['AUTH', 'PAYMENT', 'ORDER', 'SECURITY', 'SYSTEM'];
//         const severities: ('info' | 'warn' | 'error' | 'critical')[] = ['info', 'warn', 'error', 'critical'];

//         for (let d = 0; d < 15; d++) {
//             const logDate = new Date();
//             logDate.setDate(today.getDate() - d);

//             // Simula renovações de tokens diários
//             const authCount = Math.floor(Math.random() * 20) + 5;
//             for (let c = 0; c < authCount; c++) {
//                 auditLogs.push({
//                     action: 'TOKEN_REFRESHED',
//                     module: 'AUTH',
//                     severity: 'info',
//                     created_at: logDate,
//                     ip: '127.0.0.1',
//                     path: '/api/auth/refresh',
//                     method: 'POST'
//                 });
//             }

//             // Simula outros tipos de logs (erros de pagamento ou avisos de pedido) esporádicos
//             if (d % 3 === 0) {
//                 auditLogs.push({
//                     action: 'PAYMENT_ERROR',
//                     module: 'PAYMENT',
//                     severity: 'error',
//                     created_at: logDate,
//                     details: { error: 'Insuficiente saldo/Cartão recusado', gateway: 'MERCADO_PAGO' },
//                     ip: '177.100.12.54',
//                     path: '/api/payments/checkout',
//                     method: 'POST'
//                 });
//             }

//             if (d % 4 === 0) {
//                 auditLogs.push({
//                     action: 'ORDER_CREATION_FAILED',
//                     module: 'ORDER',
//                     severity: 'warn',
//                     created_at: logDate,
//                     details: { reason: 'Estoque insuficiente no fechamento' },
//                     ip: '189.43.2.11',
//                     path: '/api/orders/create',
//                     method: 'POST'
//                 });
//             }
//         }

//         // Adicionar incidentes críticos para o feed de alertas
//         auditLogs.push({
//             action: 'SECURITY_BOT_DETECTED',
//             module: 'SECURITY',
//             severity: 'critical',
//             details: { email: 'ataque_simulado@bot.com', attempts: 45, reason: 'Rate limit exceeded' },
//             created_at: new Date(),
//             path: '/api/auth/login',
//             method: 'POST',
//             ip: '198.51.100.12'
//         });

//         auditLogs.push({
//             action: 'WEBHOOK_FAILED',
//             module: 'PAYMENT',
//             severity: 'critical',
//             details: { gateway: 'MERCADO_PAGO', status: 500, response: 'Internal Server Error' },
//             created_at: new Date(),
//             path: '/api/payments/webhook',
//             method: 'POST',
//             ip: '198.51.100.32'
//         });

//         await SaaSAudit.insertMany(auditLogs);

//         // 0. Sincroniza o Usuário Marketplace (Super Admin) solicitado
//         await User.findOneAndUpdate(
//             { type: 'super_admin' },
//             {
//                 email: 'test_user_8586345624288297627@testuser.com',
//                 password: password,
//                 name: 'Marketplace Adega Hub'
//             },
//             { upsert: true }
//         );
//         console.log('✅ Marketplace (Super Admin) configurado com e-mail de teste.');

//         if (!defaultCity || !trialPlan || !litePlan || !proPlan || !premiumPlan) {
//             throw new Error('Certifique-se de rodar o db:init antes do seed para criar cidades e planos.');
//         }

//         // 2. Gerar histórico de CHURN (Estabelecimentos cancelados nos meses anteriores)
//         console.log('📉 Gerando dados históricos de cancelamento para análise de Churn...');
//         for (let m = 1; m <= 3; m++) {
//             const cancelledDate = new Date();
//             cancelledDate.setMonth(today.getMonth() - m);
//             const suffix = Date.now() + m + 999;

//             const churnedEst = new Company({
//                 res_name: `Adega Encerrada ${m} ${suffix}`,
//                 db_name: `churn_history_${m}_${suffix}`,
//                 name: 'Ex-Proprietário', // Campo obrigatório no Schema
//                 owner_name: 'Ex-Proprietário',
//                 user_id: new mongoose.Types.ObjectId(), // Necessário para validação
//                 status: 'inactive',
//                 subscription_status: 'cancelled',
//                 cancelled_at: cancelledDate,
//                 email: `churned${m}@test.com`,
//                 created_at: new Date(cancelledDate.getTime() - 60 * 24 * 60 * 60 * 1000),
//                 city_id: defaultCity._id,
//                 location: { type: 'Point', coordinates: [-46.6, -23.5] },
//                 cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', // Obrigatório
//                 openTime: '08:00', // Obrigatório
//                 closeTime: '22:00', // Obrigatório
//                 price: 50, // Obrigatório
//                 address: 'Rua do Churn, 0', // Obrigatório
//                 delivery_time: 30 // Obrigatório
//             });
//             await churnedEst.save();
//         }

//         for (let i = 1; i <= count; i++) {
//             try {
//                 const suffix = Date.now() + i;
//                 const utils = new Utils();
//                 const shortId = suffix.toString().slice(-5);
//                 const resName = `Adega Seed ${suffix}`;

//                 // Se for a primeira adega, usa o e-mail de Vendedor solicitado
//                 let email = `adm${shortId}@test.com`;
//                 if (i === 1) email = 'test_user_6592014202611907417@testuser.com';

//                 const db_name = TenantManager.slugify(resName);

//                 // Lógica de Assinatura e Planos solicitada
//                 let currentPlan: any;
//                 let subStatus = 'active';
//                 let nextPaymentDate = new Date();
//                 const now = new Date();

//                 if (i === 1) {
//                     currentPlan = premiumPlan;
//                     subStatus = 'active';
//                     nextPaymentDate.setDate(now.getDate() + 25);
//                 } else if (i === 2) {
//                     currentPlan = proPlan;
//                     subStatus = 'active';
//                     nextPaymentDate.setDate(now.getDate() - 10);
//                 } else if (i === 3) {
//                     currentPlan = trialPlan;
//                     subStatus = 'inactive';
//                     nextPaymentDate.setDate(now.getDate() - 5);
//                 } else if (i === 4) {
//                     currentPlan = litePlan;
//                     subStatus = 'inactive';
//                     nextPaymentDate.setDate(now.getDate() - 45);
//                 } else {
//                     const paidPlans = [litePlan, proPlan, premiumPlan];
//                     currentPlan = paidPlans[i % 3];
//                     nextPaymentDate.setMonth(now.getMonth() + 1);
//                 }

//                 const planName = currentPlan.name.toLowerCase();
//                 console.log(`\n📦 Processando [${i}/${count}]: ${resName}`);

//                 // 1. Criar Usuário (Dono)
//                 const user = await new User({
//                     email,
//                     verification_token: '123456',
//                     verification_token_time: Date.now() + utils.MAX_TOKEN_TIME,
//                     phone: `1199999${String(i).padStart(4, '0')}`,
//                     password,
//                     name: `Proprietário ${suffix}`,
//                     type: 'company_owner',
//                     status: 'active',
//                     email_verified: true
//                 }).save();

//                 // 1.1 Criar Usuários Comuns (Customers)
//                 console.log(`👥 Gerando customers para ${resName}...`);
//                 const customerPromises = Array.from({ length: 3 }).map((_, k) => {
//                     // Se for a primeira adega e o primeiro cliente, usa o e-mail de Comprador solicitado
//                     let customerEmail = `c${shortId}${k}@test.com`;
//                     if (i === 1 && k === 0) customerEmail = 'test_user_4758639813194551122@testuser.com';

//                     return new User({
//                         email: customerEmail,
//                         verification_token: '123456',
//                         verification_token_time: Date.now() + utils.MAX_TOKEN_TIME,
//                         phone: `119777${String(i).padStart(2, '0')}${String(k + 1).padStart(2, '0')}`,
//                         password,
//                         name: `Customer ${suffix} ${k + 1}`,
//                         type: 'user',
//                         status: 'active',
//                         email_verified: true,
//                         fcm_token: `dummy_token_customer_${shortId}_${k}` // Permite testar o fluxo de envio
//                     }).save();
//                 });
//                 const customers = await Promise.all(customerPromises);

//                 // 2. Criar Estabelecimento com Jitter na localização
//                 const lngJitter = (Math.random() - 0.5) * 0.02;
//                 const latJitter = (Math.random() - 0.5) * 0.02;

//                 const companyDoc = await new Company({
//                     res_name: resName,
//                     short_name: `Adega ${shortId}`,
//                     name: user.name,
//                     db_name: db_name,
//                     user_id: user._id,
//                     city_id: new mongoose.Types.ObjectId(String(defaultCity._id)),
//                     plan_id: new mongoose.Types.ObjectId(String(currentPlan._id)),
//                     description: `Uma adega moderna e aconchegante, gerada via CLI Seed para testes. Oferecemos uma vasta seleção de bebidas e petiscos para todos os gostos.`,
//                     cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                     location: { type: 'Point', coordinates: [-46.633 + lngJitter, -23.55 + latJitter] },
//                     email: email,
//                     phone: user.phone,
//                     cuisines: ['Cervejas Artesanais', 'Vinhos Finos', 'Destilados Premium', 'Petiscos Gourmet'],
//                     openTime: `${(8 + (i % 3)).toString().padStart(2, '0')}:00`, // Ex: 08:00, 09:00, 10:00
//                     closeTime: `${(22 + (i % 2)).toString().padStart(2, '0')}:00`, // Ex: 22:00, 23:00
//                     price: 10 * i,
//                     address: `Rua de Teste CLI ${i}, São Paulo, SP`,
//                     delivery_time: 20 + i,
//                     status: 'active',
//                     gateway_provider: 'mercado_pago',
//                     // Novos campos SaaS
//                     owner_name: user.name,
//                     plan_name: currentPlan.name,
//                     subscription_status: subStatus,
//                     subscription_date: now,
//                     next_payment_date: nextPaymentDate,
//                     monthly_revenue: 0, // Será preenchido pelo AnalyticController
//                     total_revenue: 0, // Será preenchido pelo AnalyticController
//                     orders_count: 0, // Será preenchido pelo AnalyticController
//                     avg_order_value: 0, // Será preenchido pelo AnalyticController
//                     is_premium: currentPlan.name === Plans.PREMIUM,
//                     open_days: [0, 1, 2, 3, 4, 5, 6], // Aberto todos os dias
//                     tags: ['seed', 'teste', currentPlan.name.toLowerCase()],
//                     notes: `Adega de teste gerada pelo seed CLI. Status: ${subStatus}.`,
//                     payment_config:
//                         i === 2
//                             ? {
//                                   // Estabelecimento B (i = 2): MP via Chaves Manuais e Stripe via Chaves Manuais
//                                   gateway: 'mercado_pago',
//                                   credentials: {
//                                       publicKey: 'pk_test_' + suffix,
//                                       accessToken: 'sk_test_' + suffix
//                                   },
//                                   mercado_pago: {
//                                       accessToken: Utils.encryptOAuthToken('APP_USR-' + suffix),
//                                       public_key: 'TEST-PUBLIC-KEY-' + suffix,
//                                       status: 'active',
//                                       last_authorization: new Date()
//                                   }
//                               }
//                             : i === 3
//                               ? {
//                                     // Estabelecimento C (i = 3): Sem chaves, simula desconectado
//                                     gateway: 'mercado_pago'
//                                 }
//                               : {
//                                     // Estabelecimento A e demais: MP via OAuth e Stripe Desconectado
//                                     gateway: 'mercado_pago',
//                                     mercado_pago: {
//                                         accessToken: Utils.encryptOAuthToken('TEST-TOKEN-' + suffix),
//                                         public_key: 'TEST-PUBLIC-KEY-' + suffix,
//                                         status: 'active',
//                                         last_authorization: new Date(),
//                                         refresh_token: Utils.encryptOAuthToken('TEST-REFRESH-' + suffix),
//                                         refresh_fail_count: 0
//                                     }
//                                 },
//                     enabled_payment_methods: i === 3 ? ['cod'] : ['cod', 'online']
//                 }).save();

//                 await User.findByIdAndUpdate(user._id, { company_id: companyDoc._id });

//                 // 2.1 Criar o histórico de assinatura (Subscription Model) para consistência
//                 const subscriptionDoc = await new Subscription({
//                     company_id: companyDoc._id,
//                     plan_id: currentPlan._id,
//                     status: currentPlan.name === Plans.TRIAL ? 'trialing' : 'active',
//                     current_period_start: now,
//                     current_period_end: nextPaymentDate,
//                     price_at_subscription: currentPlan.price,
//                     created_at: now,
//                     updated_at: now
//                 }).save();

//                 // 2.2 GERAR INVOICES DE TESTE (Financeiro)
//                 console.log(`💰 Gerando histórico financeiro para ${resName}...`);
//                 const invoiceHistory = [];

//                 // Caso Geral: Fatura Paga do mês anterior (se aplicável, não trial)
//                 if (i !== 3) {
//                     const lastMonth = new Date(now);
//                     lastMonth.setMonth(lastMonth.getMonth() - 1);
//                     invoiceHistory.push({
//                         company_id: companyDoc._id,
//                         subscription_id: subscriptionDoc._id,
//                         amount: currentPlan.price,
//                         status: 'paid',
//                         payment_method: 'mercado_pago',
//                         payment_date: lastMonth,
//                         due_date: lastMonth,
//                         external_id: `pay_${shortId}_prev`,
//                         notes: 'Mensalidade SaaS anterior liquidada com sucesso.'
//                     });
//                 }

//                 // Faturas específicas para simulação de cenários
//                 if (i === 1) {
//                     // Adega 1 está ativa e em dia. Próxima fatura agendada para +25 dias.
//                     invoiceHistory.push({
//                         company_id: companyDoc._id,
//                         subscription_id: subscriptionDoc._id,
//                         amount: currentPlan.price,
//                         status: 'pending',
//                         payment_method: 'mercado_pago',
//                         due_date: nextPaymentDate,
//                         notes: 'Próxima mensalidade (Agendada)'
//                     });
//                 } else if (i === 2) {
//                     // Adega 2 tem uma fatura vencida há 10 dias (dentro da tolerância de 30 dias)
//                     const overdueDate = new Date(now);
//                     overdueDate.setDate(overdueDate.getDate() - 10);
//                     invoiceHistory.push({
//                         company_id: companyDoc._id,
//                         subscription_id: subscriptionDoc._id,
//                         amount: currentPlan.price,
//                         status: 'overdue',
//                         payment_method: 'mercado_pago',
//                         due_date: overdueDate,
//                         notes: 'Mensalidade vencida há 10 dias. Conta ativa sob tolerância de 30 dias.'
//                     });
//                 } else if (i === 3) {
//                     // Adega 3 é trial expirado há 5 dias. Não gera fatura com valor real, apenas a de R$ 0.
//                     invoiceHistory.push({
//                         company_id: companyDoc._id,
//                         subscription_id: subscriptionDoc._id,
//                         amount: 0,
//                         status: 'paid',
//                         payment_date: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
//                         due_date: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
//                         notes: 'Período experimental de 30 dias encerrado.'
//                     });
//                 } else if (i === 4) {
//                     // Adega 4 tem 2 faturas vencidas (uma de 45 dias atrás, outra de 15 dias atrás) -> bloqueada.
//                     const overdueDate1 = new Date(now);
//                     overdueDate1.setDate(overdueDate1.getDate() - 45);
//                     const overdueDate2 = new Date(now);
//                     overdueDate2.setDate(overdueDate2.getDate() - 15);

//                     invoiceHistory.push({
//                         company_id: companyDoc._id,
//                         subscription_id: subscriptionDoc._id,
//                         amount: currentPlan.price,
//                         status: 'overdue',
//                         payment_method: 'mercado_pago',
//                         due_date: overdueDate1,
//                         notes: 'Fatura vencida há 45 dias. Ultrapassou o limite de 30 dias de tolerância.'
//                     });

//                     invoiceHistory.push({
//                         company_id: companyDoc._id,
//                         subscription_id: subscriptionDoc._id,
//                         amount: currentPlan.price,
//                         status: 'overdue',
//                         payment_method: 'mercado_pago',
//                         due_date: overdueDate2,
//                         notes: 'Fatura vencida há 15 dias. Segunda fatura em atraso.'
//                     });
//                 }

//                 await Invoice.insertMany(invoiceHistory);

//                 // 3. Setup Tenant
//                 const tenantConn = await TenantManager.getTenantConnection(db_name);

//                 const CategoryModel = tenantConn.model('categories', Category.schema);
//                 const ItemModel = tenantConn.model('items', Item.schema);
//                 const ProductModel = tenantConn.model('products', Product.schema);
//                 const ProductTypeModel = tenantConn.model('product_types', ProductType.schema);
//                 const ProductSizeModel = tenantConn.model('product_sizes', ProductSize.schema);
//                 const OrderModel = tenantConn.model('orders', Order.schema);
//                 const ProductObservationModel = tenantConn.model('product_observations', ProductObservation.schema);

//                 const categories = await CategoryModel.insertMany([
//                     {
//                         name: 'Bebidas e Vendas',
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         status: true,
//                         type: 'item'
//                     },
//                     {
//                         name: 'Comidas e Lanches',
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         status: true,
//                         type: 'item'
//                     },
//                     {
//                         name: 'Insumos de Cozinha',
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         status: true,
//                         type: 'insumo'
//                     }
//                 ]);

//                 const bebidasCat = categories.find((c) => c.name === 'Bebidas e Vendas')?._id;
//                 const comidasCat = categories.find((c) => c.name === 'Comidas e Lanches')?._id;
//                 const insumosCat = categories.find((c) => c.name === 'Insumos de Cozinha')?._id;

//                 // 3.1. Observações de Produtos (Linked com Categorias)
//                 console.log(`📝 Gerando observações de produtos para ${resName}...`);
//                 await ProductObservationModel.insertMany([
//                     {
//                         description: 'Com gelo e limão',
//                         linked_categories: [bebidasCat],
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id))
//                     },
//                     {
//                         description: 'Sem cebola',
//                         linked_categories: [comidasCat],
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id))
//                     },
//                     {
//                         description: 'Bem passado',
//                         linked_categories: [comidasCat],
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id))
//                     },
//                     {
//                         description: 'Para viagem',
//                         linked_categories: [bebidasCat, comidasCat],
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id))
//                     }
//                 ]);

//                 // Lógica para gerar alertas orgânicos no dashboard
//                 // Adega 1: Terá estoque crítico (1 unidade)
//                 // Adega 2: Terá limite de plano atingido (simulando 20 itens)
//                 const isCriticalStockScenario = i === 1;
//                 const isPlanLimitScenario = i === 2;

//                 // 4. Itens (Insumos / Matéria-prima)
//                 console.log(`🌾 Gerando insumos para ${resName}...`);
//                 const insumos: any[] = await ItemModel.insertMany([
//                     {
//                         name: 'Pão de Brioche',
//                         status: true,
//                         sale_price: 2.0,
//                         cost_price: 1.0,
//                         veg: true,
//                         category_id: new mongoose.Types.ObjectId(String(insumosCat)),
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         stock: 100,
//                         size: 'un',
//                         unit: 'un',
//                         cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
//                     },
//                     {
//                         name: 'Carne Bovina Moída',
//                         status: true,
//                         sale_price: 0,
//                         cost_price: 20.0,
//                         veg: false,
//                         category_id: new mongoose.Types.ObjectId(String(insumosCat)),
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         stock: isCriticalStockScenario ? 1 : 10,
//                         size: '1kg',
//                         unit: 'kg',
//                         cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
//                     }
//                 ]);

//                 // 4.1. Tamanhos e Tipos (Variations)
//                 console.log(`📏 Gerando tamanhos e tipos para ${resName}...`);
//                 const sizes = await ProductSizeModel.insertMany([
//                     {
//                         name: '500ml',
//                         sigla: 'ml',
//                         value: 500,
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         status: true
//                     },
//                     {
//                         name: 'Unidade',
//                         sigla: 'un',
//                         value: 1,
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         status: true
//                     }
//                 ]);
//                 const types = await ProductTypeModel.insertMany([
//                     {
//                         name: 'Garrafa',
//                         product_sizes_id: [sizes[0]._id],
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         status: true
//                     },
//                     {
//                         name: 'Prato',
//                         product_sizes_id: [sizes[1]._id],
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         status: true
//                     }
//                 ]);

//                 // 4.2 Produtos de Venda (com suporte a Ficha Técnica e Variações)
//                 console.log(`🍾 Gerando produtos para ${resName}...`);
//                 console.log(`🍾 Gerando produtos para ${resName}...`);
//                 const products: any[] = [];

//                 const beerDoc = await new ProductModel({
//                     name: `Cerveja Artesanal ${suffix}`,
//                     status: true,
//                     veg: true,
//                     category_id: new mongoose.Types.ObjectId(String(bebidasCat)),
//                     company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                     cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                     unit: 'un',
//                     is_featured: true,
//                     variations: [
//                         {
//                             type_id: types[0]._id,
//                             size_id: sizes[0]._id,
//                             price: 25.0,
//                             cost: 12.0,
//                             stock: isCriticalStockScenario ? 12 : 100,
//                             low_stock_limit: 5
//                         }
//                     ],
//                     questions: [
//                         {
//                             title: 'Adicionar gelo e copos?',
//                             isRequired: false,
//                             minOptions: 0,
//                             maxOptions: 2,
//                             options: [
//                                 { name: 'Saco de Gelo (Cubo) - 5kg', price: 12.0 },
//                                 { name: 'Pacote Copos Plásticos 300ml (10un)', price: 4.5 }
//                             ]
//                         },
//                         {
//                             title: 'Temperatura da Bebida',
//                             isRequired: true,
//                             minOptions: 1,
//                             maxOptions: 1,
//                             options: [
//                                 { name: 'Gelada (pronta p/ consumo)', price: 0.0 },
//                                 { name: 'Natural (temperatura ambiente)', price: 0.0 }
//                             ]
//                         }
//                     ]
//                 }).save();
//                 products.push(beerDoc);

//                 const blendExtraDoc = await new ProductModel({
//                     name: `Blend de Carne Extra 180g ${suffix}`,
//                     description: 'Adicional de carne bovina 180g porcionada.',
//                     status: true,
//                     veg: false,
//                     category_id: new mongoose.Types.ObjectId(String(insumosCat)),
//                     company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                     cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                     unit: 'un',
//                     is_featured: false,
//                     variations: [
//                         {
//                             type_id: types[1]._id,
//                             size_id: sizes[1]._id,
//                             price: 10.0,
//                             cost: 3.6,
//                             stock: 50,
//                             low_stock_limit: 5,
//                             ingredients_recipe: [{ item_id: insumos[1]._id, quantity_used: 0.18, unit: 'kg' }]
//                         }
//                     ]
//                 }).save();
//                 products.push(blendExtraDoc);

//                 const burgerDoc = await new ProductModel({
//                     name: `Hambúrguer Clássico ${suffix}`,
//                     description: 'Pão de brioche e blend de carne bovina.',
//                     status: true,
//                     veg: false,
//                     category_id: new mongoose.Types.ObjectId(String(comidasCat)),
//                     company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                     cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                     unit: 'un',
//                     is_featured: false,
//                     customizations: [
//                         {
//                             title: 'Turbine seu Burger',
//                             item_id: [insumos[0]._id, blendExtraDoc._id] // Pão de Brioche (insumo) e Blend de Carne (produto composto!)
//                         }
//                     ],
//                     variations: [
//                         {
//                             type_id: types[1]._id,
//                             size_id: sizes[1]._id,
//                             price: 35.0,
//                             cost: 15.0,
//                             stock: 50,
//                             low_stock_limit: 5,
//                             ingredients_recipe: [
//                                 { item_id: insumos[0]._id, quantity_used: 1, unit: 'un' },
//                                 { item_id: insumos[1]._id, quantity_used: 0.18, unit: 'kg' }
//                             ]
//                         }
//                     ],
//                     questions: [
//                         {
//                             title: 'Escolha o Ponto da Carne',
//                             isRequired: true,
//                             minOptions: 1,
//                             maxOptions: 1,
//                             options: [
//                                 { name: 'Ao Ponto', price: 0.0 },
//                                 { name: 'Bem Passado', price: 0.0 },
//                                 { name: 'Mal Passado', price: 0.0 }
//                             ]
//                         },
//                         {
//                             title: 'Deseja Adicionais?',
//                             isRequired: false,
//                             minOptions: 0,
//                             maxOptions: 3,
//                             options: [
//                                 { name: 'Queijo Cheddar Extra', price: 4.5 },
//                                 { name: 'Bacon Crispy', price: 6.0 },
//                                 { name: 'Molho Especial da Casa', price: 3.0 }
//                             ]
//                         }
//                     ]
//                 }).save();
//                 products.push(burgerDoc);

//                 // 4.3 Criação de Combo e Teste de Estresse de Reajuste
//                 console.log(`🍟 Gerando Combo (Cerveja + Burger) para ${resName}...`);
//                 const cervejaArtesanal = beerDoc;
//                 const burgerClassico = burgerDoc;

//                 const comboDoc = await new ProductModel({
//                     name: `Combo Pinguim da Noite ${suffix}`,
//                     description: 'Uma Cerveja Gelada + Um delicioso Burger Clássico com desconto.',
//                     status: true,
//                     is_combo: true,
//                     veg: false,
//                     category_id: new mongoose.Types.ObjectId(String(comidasCat)),
//                     company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                     cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                     unit: 'un',
//                     is_featured: true,
//                     combo_items: [
//                         {
//                             product_id: cervejaArtesanal._id,
//                             variation_id: cervejaArtesanal.variations[0]._id,
//                             quantity: 1
//                         },
//                         { product_id: burgerClassico._id, variation_id: burgerClassico.variations[0]._id, quantity: 1 }
//                     ],
//                     variations: [
//                         {
//                             type_id: types[1]._id,
//                             size_id: sizes[1]._id,
//                             price: 55.0,
//                             cost: 25.0,
//                             stock: 30,
//                             low_stock_limit: 5
//                         }
//                     ]
//                 }).save();

//                 // Simulando teste de estresse: Alterando preço da Cerveja Artesanal de R$ 25.0 para R$ 30.0
//                 console.log(
//                     `⚡ [Teste de Estresse]: Alterando preço de ${cervejaArtesanal.name} de R$ 25,00 para R$ 30,00...`
//                 );

//                 await ProductModel.findOneAndUpdate(
//                     { _id: cervejaArtesanal._id, 'variations._id': cervejaArtesanal.variations[0]._id },
//                     {
//                         'variations.$.price': 30.0,
//                         'variations.$.cost': 14.0
//                     },
//                     { new: true }
//                 );

//                 // Auditoria local: Verifica se o combo sofreu o reajuste automático
//                 const comboVerificado = await ProductModel.findById(comboDoc._id);
//                 if (comboVerificado && comboVerificado.variations && comboVerificado.variations.length > 0) {
//                     const oldPrice = comboVerificado.variations[0].old_price || comboVerificado.variations[0].price;
//                     console.log(
//                         `🔍 [Auditoria Reajuste]: Novo Preço do Combo: R$ ${comboVerificado.variations[0].price} (Histórico DE: R$ ${oldPrice})`
//                     );
//                 }

//                 // Se for o cenário de limite de plano, criamos itens fictícios até atingir o limite do Trial (20)
//                 if (isPlanLimitScenario) {
//                     const extraItems = Array.from({ length: 18 }).map((_, k) => ({
//                         name: `Produto Extra ${k} ${suffix}`,
//                         status: true,
//                         category_id: new mongoose.Types.ObjectId(String(bebidasCat)),
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         cover: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                         unit: 'un',
//                         is_featured: false,
//                         veg: true,
//                         variations: [
//                             {
//                                 type_id: types[0]._id,
//                                 size_id: sizes[0]._id,
//                                 price: 10.0,
//                                 cost: 5.0,
//                                 stock: 50,
//                                 low_stock_limit: 2,
//                                 sku: `EXTRA-${k}-${suffix}`
//                             }
//                         ]
//                     }));
//                     await ProductModel.insertMany(extraItems);
//                     console.log(`⚠️  Simulando limite de plano atingido para ${resName}`);
//                 }

//                 // 5. Pedidos de Teste
//                 console.log(`📦 Gerando pedidos para ${resName}...`);
//                 let totalRevGenerated = 0;
//                 let deliveredCount = 0;

//                 for (let j = 0; j < 5; j++) {
//                     const randomProduct = products[Math.floor(Math.random() * products.length)];
//                     const qty = Math.floor(Math.random() * 2) + 1;
//                     const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
//                     const primaryVar = randomProduct.variations[0];

//                     const order = await new OrderModel({
//                         customer_id: new mongoose.Types.ObjectId(String(randomCustomer._id)),
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         order: [
//                             {
//                                 _id: randomProduct._id,
//                                 variation_id: primaryVar._id,
//                                 name: randomProduct.name,
//                                 price: primaryVar.price,
//                                 cost_price: primaryVar.cost || 0,
//                                 quantity: qty
//                             }
//                         ],
//                         address: { address: 'Rua das Adegas, 123', house: 'Casa Seed', lat: -23.55, lng: -46.63 },
//                         status: j === 0 ? 'created' : 'delivered',
//                         total: primaryVar.price * qty,
//                         grandTotal: primaryVar.price * qty + 7,
//                         deliveryCharge: 7,
//                         payment_status: j !== 0,
//                         payment_mode: 'cash',
//                         createdAt: new Date(Date.now() - j * 3600000 * 4)
//                     }).save();

//                     // Sincroniza com o Índice Global em background (não trava o loop)
//                     new GlobalOrder({
//                         customer_id: new mongoose.Types.ObjectId(String(randomCustomer._id)),
//                         company_id: new mongoose.Types.ObjectId(String(companyDoc._id)),
//                         tenant_order_id: order._id,
//                         items: order.order, // Incluído
//                         status: order.status,
//                         total: order.total,
//                         grandTotal: order.grandTotal,
//                         payment_status: order.payment_status,
//                         created_at: order.createdAt
//                     })
//                         .save()
//                         .catch((err) => console.error('Erro sync global:', err.message));

//                     if (order.status === 'delivered') {
//                         totalRevGenerated += order.grandTotal;
//                         deliveredCount++;
//                     }
//                 }

//                 // 5.1 Sincroniza métricas denormalizadas para o Dashboard não vir vazio
//                 await Company.findByIdAndUpdate(companyDoc._id, {
//                     total_revenue: Number(totalRevGenerated.toFixed(2)),
//                     monthly_revenue: Number(totalRevGenerated.toFixed(2)),
//                     orders_count: deliveredCount,
//                     avg_order_value: deliveredCount > 0 ? Number((totalRevGenerated / deliveredCount).toFixed(2)) : 0
//                 });

//                 // 6. Criar Banners de Teste no Banco Central (HubDB)
//                 console.log(`🖼️  Gerando banners para ${resName}...`);

//                 const bannerData: any[] = [
//                     {
//                         banner: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                         company_id: companyDoc._id,
//                         city_id: defaultCity._id,
//                         is_global: false,
//                         radius: planName === 'premium' ? 20 : 5,
//                         location: companyDoc.location,
//                         status: true,
//                         // Premium 25 dias, Outros 15 dias
//                         expires_at: new Date(
//                             Date.now() + (currentPlan.name === Plans.PREMIUM ? 25 : 15) * 24 * 60 * 60 * 1000
//                         )
//                     },
//                     // BANNER DE TESTE: Criado já expirado (24h atrás)
//                     {
//                         banner: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample_expired.jpg',
//                         company_id: companyDoc._id,
//                         city_id: defaultCity._id,
//                         is_global: false,
//                         radius: 10,
//                         location: companyDoc.location,
//                         status: true,
//                         // Data de ontem: Garante que o filtro $gt Date.now() ignore este registro
//                         expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
//                     }
//                 ];

//                 // Apenas Premium ganha um banner global no Seed
//                 if (planName === 'premium') {
//                     bannerData.push({
//                         banner: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
//                         company_id: companyDoc._id,
//                         city_id: defaultCity._id,
//                         is_global: true,
//                         radius: 0,
//                         location: { type: 'Point', coordinates: [0, 0] },
//                         status: true,
//                         // Expira em 5 dias (Padrão Premium Global)
//                         expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
//                     });
//                 }

//                 await Banner.insertMany(bannerData);

//                 console.log(`✅ Sucesso: ${email} | DB: ${db_name}`);
//             } catch (loopError: any) {
//                 console.error(`❌ Erro na adega ${i}:`, loopError.message);
//             }
//         }

//         // Sincronização final das métricas no HubDB para garantir dashboard correto
//         console.log('\n📊 Sincronizando métricas analíticas globais...');
//         await AnalyticController.syncCompanysMetrics();

//         console.log('\n✨ Seed CLI concluído com sucesso!');
//         process.exit(0);
//     } catch (e) {
//         console.error('❌ Erro no Seed:', e);
//         process.exit(1);
//     }
// }

// seed();
