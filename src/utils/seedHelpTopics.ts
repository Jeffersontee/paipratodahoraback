import * as fs from 'fs';
import * as path from 'path';
import HelpCategory from '../models/HelpCategory';

export interface IHelpTopicData {
    id: string;
    title: string;
    content: string[];
}

export interface IHelpCategoryData {
    id: string;
    title: string;
    icon: string;
    order: number;
    topics: IHelpTopicData[];
}

export const DEFAULT_BRAVO_HELP_SECTIONS: IHelpCategoryData[] = [
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
                    'Telefone: Número de contato telefônico/WhatsApp para notificação automática sobre agendamentos e chamados.'
                ]
            },
            {
                id: 'collaborator-roles',
                title: 'Perfis de Acesso e Funções',
                content: [
                    'O sistema diferencia os papéis atribuídos a cada colaborador dentro da empresa:',
                    'Técnico de Campo: Recebe ordens de serviço, realiza check-in/checkout e preenche laudos técnicos.',
                    'Supervisor: Acompanha a execução dos técnicos de sua equipe e aprova serviços.',
                    'Operador: Realiza triagem e agendamento básico de chamados no painel.'
                ]
            }
        ]
    },
    {
        id: 'services',
        title: 'Catálogo de Serviços',
        icon: 'construct-outline',
        order: 2,
        topics: [
            {
                id: 'service-data',
                title: 'Dados e Precificação do Serviço',
                content: [
                    'Informações essenciais de identificação e valor comercial do serviço prestado.',
                    'Nome do Serviço: Título exibido no aplicativo do cliente e nas Ordens de Serviço.',
                    'Descrição: Detalhes do escopo e atividades incluídas no atendimento técnico.',
                    'Categoria: Segmento de atuação (ex: Elétrica, Hidráulica, Serralheria, Ar-Condicionado).',
                    'Preço Base: Valor de referência praticado para a execução padrão do serviço.'
                ]
            },
            {
                id: 'service-icons',
                title: 'Ícones e Identidade Visual',
                content: [
                    'Cada serviço pode possuir um ícone do Ionicons associado para facilitar o reconhecimento visual rápido nas listagens e cards operacionais.'
                ]
            }
        ]
    },
    {
        id: 'units',
        title: 'Unidades e Filiais',
        icon: 'business-outline',
        order: 3,
        topics: [
            {
                id: 'unit-management',
                title: 'Gerenciamento de Filiais e Pontos de Atendimento',
                content: [
                    'Unidades representam os endereços físicos dos estabelecimentos onde as manutenções e instalações são realizadas.',
                    'Ao cadastrar uma filial, informe o endereço completo (com CEP e número) para roteirização e cálculo de deslocamento dos técnicos.'
                ]
            }
        ]
    },
    {
        id: 'service_orders',
        title: 'Ordens de Serviço e Execução',
        icon: 'clipboard-outline',
        order: 4,
        topics: [
            {
                id: 'service-order-flow',
                title: 'Guia de Cores e Status Operacionais',
                content: [
                    'As Ordens de Serviço utilizam o mesmo padrão de cores e status em toda a plataforma:',
                    '<span class="status-pill status-secondary">SOLICITADO</span>: Chamado aberto pelo solicitante aguardando triagem ou confirmação de agenda.',
                    '<span class="status-pill status-primary">AGENDADO</span>: Serviço confirmado com técnico designado na data e horário marcados.',
                    '<span class="status-pill status-tertiary">TÉCNICO A CAMINHO</span>: Deslocamento iniciado pelo técnico até a filial indicada.',
                    '<span class="status-pill status-warning">EM EXECUÇÃO</span>: Check-in presencial realizado e serviço técnico em andamento.',
                    '<span class="status-pill status-secondary">AGUARDANDO ASSINATURA</span>: Relatório técnico pronto aguardando validação do responsável.',
                    '<span class="status-pill status-success">CONCLUÍDO</span>: Atendimento finalizado e aprovado com sucesso.',
                    '<span class="status-pill status-danger">CANCELADO / RECUSADO</span>: Chamado recusado ou cancelado por impedimento.'
                ]
            },
            {
                id: 'gut-matrix',
                title: 'Matriz GUT (Priorização de Chamados)',
                content: [
                    'A Matriz GUT permite classificar chamados de 1 a 5 de acordo com Gravidade, Urgência e Tendência de agravamento.',
                    'O Score GUT calculado prioriza automaticamente os chamados mais críticos na fila de atendimento.'
                ]
            }
        ]
    },
    {
        id: 'billing',
        title: 'Faturamento e Assinaturas SaaS',
        icon: 'cash-outline',
        order: 5,
        topics: [
            {
                id: 'billing-invoices',
                title: 'Minhas Faturas e Pagamento PIX',
                content: [
                    'Acesse a tela Minhas Faturas para visualizar as cobranças mensais do plano contratado.',
                    'O sistema gera automaticamente as faturas preventivas com antecedência ao vencimento.',
                    'Você pode gerar o código PIX instantaneamente para quitação direta no seu banco.'
                ]
            },
            {
                id: 'subscription-plans',
                title: 'Planos e Recursos Disponíveis',
                content: [
                    'Os planos SaaS determinam a cota de serviços no catálogo, quantidade de filiais e usuários simultâneos suportados na plataforma.'
                ]
            }
        ]
    }
];

/**
 * Realiza o seeding e sincronização não-destrutiva (merge) da Central de Ajuda.
 * Não apaga dados pré-existentes no banco em Staging ou Produção.
 */
export async function seedHelpTopics(customSections?: IHelpCategoryData[]): Promise<void> {
    try {
        console.log('--- 📚 Iniciando Sincronização Inteligente da Central de Ajuda ---');
        
        let sectionsToSync = customSections;

        if (!sectionsToSync) {
            const dataPath = path.resolve(__dirname, '../data/helpData.json');
            if (fs.existsSync(dataPath)) {
                try {
                    const fileContent = fs.readFileSync(dataPath, 'utf-8');
                    sectionsToSync = JSON.parse(fileContent);
                    console.log(`📂 Carregando dados exportados de Central de Ajuda a partir de: src/data/helpData.json`);
                } catch (readErr) {
                    console.warn('⚠️ Falha ao ler helpData.json, usando padrão hardcoded.', readErr);
                    sectionsToSync = DEFAULT_BRAVO_HELP_SECTIONS;
                }
            } else {
                sectionsToSync = DEFAULT_BRAVO_HELP_SECTIONS;
            }
        }

        for (const section of (sectionsToSync || [])) {
            const existing = await HelpCategory.findOne({ id: section.id });

            if (!existing) {
                // Se a categoria não existe, cria do zero
                const newCategory = new HelpCategory({
                    id: section.id,
                    title: section.title,
                    icon: section.icon,
                    topics: section.topics,
                    order: section.order
                });
                await newCategory.save();
                console.log(`✅ Nova Categoria de Ajuda criada: "${section.title}" (${section.id})`);
            } else {
                // Categoria já existe: Atualiza metadados principais
                existing.title = section.title;
                existing.icon = section.icon;
                existing.order = section.order;

                // Merge inteligente dos tópicos
                const existingTopics = (existing.topics || []) as any[];

                for (const incomingTopic of section.topics) {
                    const matchIndex = existingTopics.findIndex((t: any) => t.id === incomingTopic.id);

                    if (matchIndex !== -1) {
                        // Tópico já existe: atualiza título e conteúdo mantendo _id original
                        existingTopics[matchIndex].title = incomingTopic.title;
                        existingTopics[matchIndex].content = incomingTopic.content;
                    } else {
                        // Tópico novo nesta categoria: adiciona
                        existingTopics.push({
                            id: incomingTopic.id,
                            title: incomingTopic.title,
                            content: incomingTopic.content
                        });
                        console.log(`  ➕ Novo tópico mesclado: "${incomingTopic.title}" em [${section.id}]`);
                    }
                }

                existing.topics = existingTopics as any;
                await existing.save();
                console.log(`ℹ️ Categoria de Ajuda mesclada e sincronizada: "${section.title}" (${section.id})`);
            }
        }

        console.log('--- ✨ Sincronização da Central de Ajuda concluída com sucesso! ---');
    } catch (error: any) {
        console.error('❌ Erro durante sincronização da Central de Ajuda:', error?.message || error);
        throw error;
    }
}
