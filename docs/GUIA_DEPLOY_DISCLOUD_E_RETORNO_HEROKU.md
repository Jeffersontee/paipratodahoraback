# Guia de Operação: Discloud & Retorno ao Heroku 🐧☁️

Este documento orienta sobre a operação contínua do backend na **Discloud** (em Reais) e o passo a passo exato para **alternar ou retornar para o Heroku** a qualquer momento, mantendo a interoperabilidade total de ambos os ambientes.

---

## 📌 1. Visão Geral da Arquitetura Dual-Cloud

O projeto foi arquitetado para ser **100% agnóstico à nuvem**, suportando tanto o **Discloud** quanto o **Heroku** em paralelo no mesmo código-fonte:

| Item | Discloud (Produção Principal / BRL) | Heroku (Produção Secundária / USD) |
| :--- | :--- | :--- |
| **URL da API** | `https://bravoback.discloud.app/api/` | `https://bravo-production-app-94ee98927401.herokuapp.com/api/` |
| **Arquivo de Config** | `discloud.config` + `.discloudignore` | `Procfile` / `package.json` (`heroku-postbuild`) |
| **Porta do Servidor** | `8080` (Interface `0.0.0.0`) | Injetada dinamicamente via `process.env.PORT` |
| **Método de Deploy** | CLI Discloud (`app commit`) ou Painel | Git Push (`git push heroku main`) ou Heroku CLI |
| **Moeda / Cobrança** | Reais (R$) via PIX / Cartão Nacional | Dólar ($) via Cartão Internacional |

---

## 🚀 2. Como Operar no Discloud (Dia a Dia)

### 2.1. Novo Deploy (Atualização de Código)
Sempre que fizer alterações no backend e quiser publicar na Discloud:

```bash
# 1. Acesse a pasta do backend
cd c:\workspace\workspace_bravo-instalacoes\bravoback

# 2. Compile o TypeScript
npm run build

# 3. Envie a atualização para a Discloud
npx discloud-cli app commit bravoback
```

### 2.2. Comandos de Monitoramento e Manutenção
| Ação | Comando |
| :--- | :--- |
| **Ver Status em Tempo Real** | `npx discloud-cli app status bravoback` |
| **Ver Logs da Aplicação** | `npx discloud-cli app logs bravoback` |
| **Reiniciar a Aplicação** | `npx discloud-cli app restart bravoback` |
| **Consultar Informações da Conta / RAM** | `npx discloud-cli user info` |

---

## 🔄 3. Como Voltar ou Alternar para o Heroku

Caso deseje migrar de volta ou usar o Heroku como servidor de contingência, siga os 3 passos simples abaixo:

### Passo 1: Fazer o Deploy no Heroku
No terminal do `bravoback`:

```bash
# 1. Garanta que as alterações estão comitadas no Git
git add .
git commit -m "feat: atualizacoes do backend"

# 2. Envie para o Heroku
git push heroku main
```
*(Se estiver usando o Heroku Dashboard com GitHub conectado, basta fazer o merge na branch `main`)*.

### Passo 2: Ajustar a URL no Frontend (`bravofront`)
Abra o arquivo [`bravofront/src/environments/environment.prod.ts`](file:///c:/workspace/workspace_bravo-instalacoes/bravofront/src/environments/environment.prod.ts) e aponte as URLs de volta para o Heroku:

```typescript
export const environment: Environment = {
  production: true,
  deliveryRadiusKm: 120,
  // Heroku:
  serverUrl: 'https://bravo-production-app-94ee98927401.herokuapp.com/api/',
  imageUrl: 'https://bravo-production-app-94ee98927401.herokuapp.com/uploads/',
  // ... demais configurações
};
```

### Passo 3: Reiniciar / Rebuild do Frontend
Se o frontend estiver rodando localmente em modo produção:
```bash
ionic serve --configuration=production
```
Ou se for gerar o bundle web/Android para publicação:
```bash
npm run build:prod
```

---

## ⚙️ 4. Variáveis de Ambiente & Sincronização

Tanto o Discloud quanto o Heroku compartilham as mesmas chaves de configuração:

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `NODE_ENV` | Define o ambiente ativo | `production` |
| `PROD_DB_URI` | String de conexão MongoDB Atlas | `mongodb+srv://...` |
| `PROD_JWT_SECRET_KEY` | Chave secreta de autenticação JWT | `0SrLnJxz...` |
| `PROD_REFRESH_TOKEN_SECRET` | Chave secreta do Refresh Token | `PgE8K8l...` |
| `PROD_SERVER_REDIS_HOST` | Host do Redis Cloud | `redis-15698.c10.us-east-1-2.ec2.cloud.redislabs.com` |
| `PROD_SERVER_REDIS_PORT` | Porta do Redis Cloud | `15698` |
| `PROD_SERVER_REDIS_USERNAME` | Usuário do Redis Cloud | `livecodesystem` |
| `PROD_SERVER_REDIS_PASSWORD` | Senha do Redis Cloud | `********` |
| `PROD_CLOUDINARY_*` | Credenciais de Upload de Imagem | Cloudinary Config |
| `PROD_MERCADOPAGO_*` | Credenciais do Mercado Pago | Tokens e Webhook Secrets |

> **Nota:** No Discloud, a variável `PORT` deve ser `8080` (ou não declarada). No Heroku, a variável `PORT` é injetada automaticamente pela plataforma.

---

## 🛡️ 5. Resolução Rápida de Problemas

- **Erro `502 Bad Gateway` (Discloud):** Verifique se o `PORT` está como `8080` e se o `host` está escutando em `0.0.0.0`.
- **Erro `400 / Subdomínio indisponível`:** Verifique se o `ID` no `discloud.config` coincide com o subdomínio criado na aba *Domínios* do painel.
- **Falha de CORS:** O backend já autoriza `localhost`, `*.herokuapp.com`, `*.discloud.app`, `*.web.app` e `*.firebaseapp.com`.
