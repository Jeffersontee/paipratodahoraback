# Deploy Contínuo (CI/CD) no Heroku

Este documento serve como referência técnica detalhada para gerenciar deploys contínuos e configurar o servidor de produção no Heroku utilizando GitHub Actions.

---

## 🚀 1. Estrutura do Workflow do GitHub Actions

O deploy automático para Produção está configurado no arquivo [deploy.yml](file:///c:/workspace/workspace_bravo-instalacoes/bravoback/.github/workflows/deploy.yml).

### Passos executados ao fazer `push` na branch `main`:
1. **Checkout do Código:** Faz o clone do repositório no runner do GitHub.
2. **Setup do Node.js:** Define a versão `20.20.2`.
3. **Instalação das Dependências:** Executa `npm ci` para garantir que o build siga a integridade referencial exata do arquivo `package-lock.json`.
4. **Testes e Build:** Executa `npm test` e `npm run build`.
5. **Deploy Automático:** Se os testes passarem, o GitHub Actions autentica no Heroku via chave API e empurra a branch `main` do repositório para o remoto do Heroku.

---

## ⚙️ 2. Configurando o Repositório no GitHub

Para que o deploy funcione, você precisa configurar os segredos (Secrets) no repositório do seu GitHub (acesse seu repositório -> **Settings** -> **Secrets and variables** -> **Actions**):

1. **`HEROKU_API_KEY`**: Sua chave API do Heroku.
   * *Onde conseguir:* Entre no dashboard do Heroku, vá em **Account Settings** -> aba **Account** -> **API Key** -> clique em **Reveal**.
2. **`HEROKU_APP_PRODUCTION`**: O nome da sua aplicação de Produção no Heroku.
   * *Valor atual:* `bravo-production-app-94ee98927401`
3. **`HEROKU_APP_STAGING`**: O nome da sua aplicação de Staging no Heroku.
   * *Valor atual:* `adega-hub-staging-app-b43f425ba856`

---

## 🛠️ 3. Enviando as Variáveis de Ambiente para a Heroku

As variáveis no ambiente de produção (`enviroment.prod.ts`) são mapeadas com o prefixo `PROD_`. Todas elas precisam ser configuradas nas **Config Vars** da Heroku para a nova aplicação.

### Como configurar via CLI (Terminal):
Caso tenha a Heroku CLI instalada, você pode definir as variáveis em lote rodando comandos no seu terminal:

```bash
# Definir as variáveis de rotas e urls
heroku config:set PROD_HEROKU_URI="https://bravo-production-app-94ee98927401.herokuapp.com" -a bravo-production-app-94ee98927401
heroku config:set PROD_NOTIFICATION_URI="https://bravo-production-app-94ee98927401.herokuapp.com" -a bravo-production-app-94ee98927401
heroku config:set PROD_MERCADOPAGO_REDIRECT_URI="https://bravo-production-app-94ee98927401.herokuapp.com/mercadopago/callback" -a bravo-production-app-94ee98927401
heroku config:set PROD_FRONTEND_URL="https://bravo-production-app-94ee98927401.herokuapp.com" -a bravo-production-app-94ee98927401

# Definir as chaves e banco de dados
heroku config:set PROD_DB_URI="mongodb+srv://..." -a bravo-production-app-94ee98927401
heroku config:set PROD_JWT_SECRET_KEY="SUA_CHAVE_AQUI" -a bravo-production-app-94ee98927401
heroku config:set PROD_REFRESH_TOKEN_SECRET="SUA_CHAVE_AQUI" -a bravo-production-app-94ee98927401
```

### Como configurar via Dashboard (Web):
1. Acesse o [Dashboard da Heroku](https://dashboard.heroku.com/apps).
2. Selecione a aplicação `bravo-production-app-94ee98927401`.
3. Clique na aba **Settings**.
4. Procure pela seção **Config Vars** e clique em **Reveal Config Vars**.
5. Adicione as chaves (`Key`) e os valores (`Value`) mapeados de produção.

---

## 🔍 4. Diagnóstico de Logs e Erros de Inicialização

Se a aplicação falhar ou apresentar erro de publicação, utilize estes comandos na Heroku CLI para depuração:

* **Visualizar logs em tempo real:**
  ```bash
  heroku logs --tail -a bravo-production-app-94ee98927401
  ```
* **Visualizar as últimas 100 linhas de log:**
  ```bash
  heroku logs -n 100 -a bravo-production-app-94ee98927401
  ```

### Erros Comuns:
* **H10 App Crashed:** Ocorre se a aplicação falhar na inicialização ou se a porta `process.env.PORT` não for ouvida. Certifique-se de que a variável `PORT` está exposta e mapeada.
* **Error: Cannot find module:** A pasta `dist` pode não ter sido compilada corretamente. Verifique se o script `build` (em `package.json`) está rodando corretamente durante a esteira.
