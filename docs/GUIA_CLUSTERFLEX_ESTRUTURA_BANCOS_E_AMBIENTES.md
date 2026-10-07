# 🌐 Guia de Arquitetura Multi-Bancos: ClusterFlex (MongoDB Atlas)

Este documento estabelece a padronização, convenções de nomenclatura e strings de conexão para a gestão multi-projetos e multi-ambientes centralizados no cluster **ClusterFlex** do MongoDB Atlas.

---

## 📌 1. Visão Geral do Cluster

- **Cluster:** `ClusterFlex`
- **Host:** `clusterflex.7ykd4se.mongodb.net`
- **Provedor:** MongoDB Atlas (Multi-Tenant / Multi-Database)
- **Estratégia:** Um banco de dados isolado por aplicação e por ambiente (`dev`, `homolog`, `prod`) dentro da mesma instância de cluster.

---

## 🏷️ 2. Convenção de Nomenclatura dos Bancos

A nomenclatura segue estritamente o padrão **`snake_case`**:
```text
<nome_do_projeto>_<ambiente>
```

### Ambientes Padronizados:
- **`dev`**: Desenvolvimento local e testes diários.
- **`homolog`**: Homologação, Staging e validação pré-produção.
- **`prod`**: Ambiente de produção e dados reais de clientes.

---

## 🗂️ 3. Mapeamento de Projetos e Bancos de Dados

| Projeto | Ambiente | Nome do Banco (`DB_NAME`) | Descrição |
| :--- | :--- | :--- | :--- |
| **Pai Pra Toda Obra** | `dev` | `paipratodaobra_dev` | Banco de desenvolvimento |
| | `homolog` | `paipratodaobra_homolog` | Banco de homologação / staging |
| | `prod` | `paipratodaobra_prod` | Banco de produção |
| **Forbis Senior** | `dev` | `forbissenior_dev` | Banco de desenvolvimento |
| | `homolog` | `forbissenior_homolog` | Banco de homologação / staging |
| | `prod` | `forbissenior_prod` | Banco de produção |
| **Tax Smart** | `dev` | `taxsmart_dev` | Banco de desenvolvimento |
| | `homolog` | `taxsmart_homolog` | Banco de homologação / staging |
| | `prod` | `taxsmart_prod` | Banco de produção |

---

## 🔗 4. Strings de Conexão (Connection Strings)

### 🏗️ 4.1. Pai Pra Toda Obra

#### Desenvolvimento (`dev`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/paipratodaobra_dev?retryWrites=true&w=majority&appName=ClusterFlex
```

#### Homologação (`homolog`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/paipratodaobra_homolog?retryWrites=true&w=majority&appName=ClusterFlex
```

#### Produção (`prod`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/paipratodaobra_prod?retryWrites=true&w=majority&appName=ClusterFlex
```

---

### 🏢 4.2. Forbis Senior

#### Desenvolvimento (`dev`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/forbissenior_dev?retryWrites=true&w=majority&appName=ClusterFlex
```

#### Homologação (`homolog`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/forbissenior_homolog?retryWrites=true&w=majority&appName=ClusterFlex
```

#### Produção (`prod`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/forbissenior_prod?retryWrites=true&w=majority&appName=ClusterFlex
```

---

### 📊 4.3. Tax Smart

#### Desenvolvimento (`dev`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/taxsmart_dev?retryWrites=true&w=majority&appName=ClusterFlex
```

#### Homologação (`homolog`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/taxsmart_homolog?retryWrites=true&w=majority&appName=ClusterFlex
```

#### Produção (`prod`)
```text
mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/taxsmart_prod?retryWrites=true&w=majority&appName=ClusterFlex
```

---

## ⚙️ 5. Modelos de Arquivos `.env`

### Exemplo para o projeto **Pai Pra Toda Obra**:

```ini
# ==========================================
# AMBIENTE DE DESENVOLVIMENTO (.env.dev)
# ==========================================
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/paipratodaobra_dev?retryWrites=true&w=majority&appName=ClusterFlex
DB_NAME=paipratodaobra_dev

# ==========================================
# AMBIENTE DE HOMOLOGAÇÃO (.env.staging)
# ==========================================
NODE_ENV=staging
PORT=3000
MONGO_URI=mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/paipratodaobra_homolog?retryWrites=true&w=majority&appName=ClusterFlex
DB_NAME=paipratodaobra_homolog

# ==========================================
# AMBIENTE DE PRODUÇÃO (.env.prod)
# ==========================================
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://jeffersontee_db_user:ngZs8SgVSrF40kqV@clusterflex.7ykd4se.mongodb.net/paipratodaobra_prod?retryWrites=true&w=majority&appName=ClusterFlex
DB_NAME=paipratodaobra_prod
```

---

## 🔒 6. Boas Práticas e Recomendações de Segurança

1. **Criação Sob Demanda (Auto-provisioning):**
   - O MongoDB Atlas cria o banco de dados e as coleções automaticamente na primeira operação de escrita (`insert`, `save`, migration ou seed). Não é necessário criar manualmente no painel web.

2. **Network Access (Whitelist de IPs):**
   - Para ambientes de desenvolvimento local, certifique-se de que seu IP atual (ou `0.0.0.0/0` temporário para desenvolvimento) esteja liberado na aba **Network Access** do Atlas.
   - Para ambientes de produção/homologação (ex: Heroku, AWS, Discloud, VPS), configure os IPs estáticos ou faixas permitidas.

3. **Controle de Usuários e Permissões:**
   - Para ambientes de produção de alta criticidade, recomenda-se criar usuários do banco com permissões escopadas apenas ao banco de dados correspondente (ex: usuário `paipratodaobra_prod_user` com permissão restrita `readWrite` no banco `paipratodaobra_prod`).

---

## 🚀 7. Comandos de Banco por Ambiente (`npm run`)

Execute estes comandos sempre dentro da pasta do backend (`bravoback`):

| Ação | Desenvolvimento (`dev`) | Homologação (`staging`/`homolog`) | Produção (`prod`) |
| :--- | :--- | :--- | :--- |
| **Limpar Banco** | `npm run db:clear` | `npm run db:clear:staging` *(ou `:homolog`)* | `npm run db:clear:prod` |
| **Estrutura Base** | `npm run db:init` | `npm run db:init:staging` *(ou `:homolog`)* | `npm run db:init:prod` |
| **Sementeira Completa** | `npm run db:seed` | `npm run db:seed:staging` *(ou `:homolog`)* | `npm run db:seed:prod` |

