---
name: skill-orchestrator
description: Orquestrador e gerador automático de novas Skills, Agentes e Scripts para manter a padronização arquitetural da workspace.
---

# Orquestrador de Skills e Agentes

Esta skill serve como a referência principal (Meta-Skill) para a criação de **novas skills**, **regras** ou **scripts** nesta workspace.

Quando o usuário solicitar a criação de uma nova funcionalidade de aprendizado (skill), você deve utilizar o script interativo localizado em `scripts/create-skill.ts` para gerar a estrutura de pastas automaticamente, em vez de criar os arquivos um a um.

## Regras Arquiteturais
Toda skill criada nesta workspace segue o padrão exigido nas regras globais:
- Diretório em `.agents/skills/<nome-da-skill>/`
- `SKILL.md` curto contendo o frontmatter YAML e instruções diretas.
- Diretório `agents/` para arquivos de configuração `.toml`/`.yaml` do Impeccable.
- Diretório `references/` para armazenar a documentação pesada.
- Diretório `scripts/` para utilitários automatizados daquela skill.

## Como Usar o Orquestrador
Como o script agora é TypeScript nativo (`.ts`), utilize o `ts-node` (via npx) para executá-lo diretamente a partir da raiz do projeto:
```bash
npx ts-node .agents/skills/skill-orchestrator/scripts/create-skill.ts "nome-da-skill" "Breve descrição do que a skill faz"
```
Ele criará a estrutura completa automaticamente. Leia `references/architecture.md` para mais detalhes sobre a organização de agentes.

## Auditoria de Eficiência e Uso de Contexto
Para visualizar quais skills foram lidas e calcular a economia de tempo acumulada na sessão atual do chat, execute:
```bash
npx ts-node .agents/skills/skill-orchestrator/scripts/audit-usage.ts
```
O script lerá o transcript ativo da IDE e apresentará o sumário consolidado no terminal.


