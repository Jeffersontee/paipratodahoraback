# 🛠️ Guia Operacional de Banco de Dados, Seeds e Heroku (Notion)

> **Projeto:** Bravo Instalações (`bravoback` / `bravofront`)  
> **App Heroku Produção:** `bravo-production-app`  
> **App Heroku Staging:** `bravo-staging-app`  
> **Status:** 🟢 Homologado & Testado  

---

## 💻 1. Ambiente Local (Desenvolvimento)

Em ambiente local, os comandos utilizam automaticamente as variáveis configuradas no seu arquivo `.env`.

* **Limpar tudo (Reset do Banco Local):**
  ```bash
  npm run db:clear
  ```

* **Rodar Inicialização & Seed Completo (`InitialBravoDb.ts`):**
  ```bash
  npm run db:init
  ```
  *(Cria os Planos SaaS, Empresas parceiras, Assinaturas, 18 Faturas com histórico mensal, Usuários Staff, Colaboradores técnicos, Unidades operacionais, Catálogo de Serviços, Ordens de Serviço e as 5 Categorias da Central de Ajuda).*

* **Sincronizar Central de Ajuda (Merge Não-Destrutivo):**
  ```bash
  npm run seed:help
  ```

* **Exportar Central de Ajuda do Banco para JSON (`helpData.json`):**
  ```bash
  npm run export:help
  ```

---

## 🧪 2. Ambiente de Staging (Heroku Staging)

Utilize estes comandos para preparar ou resetar o ambiente de homologação (`bravo-staging-app`).

* **Limpar tudo no Staging:**
  ```bash
  heroku run "npm run db:clear" --app bravo-staging-app
  ```

* **Rodar Inicialização & Seed no Staging:**
  ```bash
  heroku run "npm run db:init" --app bravo-staging-app
  ```

* **Sincronizar Tópicos da Central de Ajuda no Staging:**
  ```bash
  heroku run "npm run seed:help" --app bravo-staging-app
  ```

---

## 🚀 3. Ambiente de Produção (Heroku Production: `bravo-production-app`)

> ⚠️ **Atenção:** Os comandos de reset (`db:clear`) em produção possuem trava de segurança integrada contra execução acidental. Por isso, a flag de força `FORCE_SEED=true` é **obrigatória**.

* **Limpar tudo em Produção (Reset Total com Trava de Segurança):**
  ```bash
  heroku run "FORCE_SEED=true npm run db:clear" --app bravo-production-app
  ```

* **Rodar Inicialização & Seed em Produção:**
  ```bash
  heroku run "npm run db:init" --app bravo-production-app
  ```

* **Sincronizar/Atualizar Central de Ajuda em Produção (Sem perder dados):**
  ```bash
  heroku run "npm run seed:help" --app bravo-production-app
  ```
  *(Recomendado para deploys contínuos: insere novos tópicos e atualiza textos sem deletar dados criados em produção).*

---

## 📋 Resumo dos Comandos Disponíveis no `package.json`

| Comando | Script Executado | Descrição |
| :--- | :--- | :--- |
| `npm run db:clear` | `ts-node src/scripts/clearAllDatabases.ts` | Limpa com segurança todas as coleções do MongoDB conectado. |
| `npm run db:init` | `ts-node src/scripts/InitialBravoDb.ts` | Semeia todo o ecossistema com dados ricos e consistentes. |
| `npm run db:seed` | `ts-node src/scripts/InitialBravoDb.ts` | Alias padrão para o seed do sistema. |
| `npm run seed:help` | `ts-node src/scripts/seedHelpScript.ts` | Merge inteligente e não-destrutivo da Central de Ajuda. |
| `npm run export:help` | `ts-node src/scripts/exportHelpScript.ts` | Exporta a Central de Ajuda para `src/data/helpData.json`. |
