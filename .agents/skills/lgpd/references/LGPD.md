# LGPD — Lei Geral de Proteção de Dados (Backend Guidelines)

Este documento estabelece as diretrizes arquiteturais e técnicas para garantir a conformidade do backend (**Node.js / Express / Mongoose**) com a **Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)** no ecossistema Bravo Instalações / Adega Pinguins.

---

## 1. Princípios Fundamentais Aplicados ao Backend

1. **Minimização de Dados (Data Minimization):** Coletar e armazenar apenas os campos estritamente necessários para a prestação dos serviços (e-mail, nome, CPF/CNPJ, telefone, endereço de atendimento).
2. **Finalidade e Adequação:** Os dados pessoais capturados devem ter propósito explícito e legítimo (ex: emissão de ordem de serviço, faturamento SaaS, autenticação).
3. **Transparência e Livre Acesso:** O titular tem direito de consultar quais dados o sistema mantém sobre ele a qualquer momento.
4. **Segurança e Confidencialidade:** Proteção contra acessos não autorizados, vazamentos, alterações acidentais ou destruição.

---

## 2. Registro de Consentimento (Opt-in & Auditoria)

Todo cadastro de usuário (Cliente, Lojista, Colaborador) deve gravar os metadados de aceite da **Política de Privacidade** e **Termos de Uso**.

### Schema Pattern (Mongoose)

```typescript
const PrivacyConsentSchema = new Schema({
  accepted: { type: Boolean, required: true },
  version: { type: String, required: true }, // ex: "v1.2.2026"
  accepted_at: { type: Date, default: Date.now },
  ip_address: { type: String, required: true },
  user_agent: { type: String }
});

// Incorporado no UserModel / CompanyOwnerModel / CollaboratorModel
userSchema.add({
  privacy_consent: PrivacyConsentSchema
});
```

---

## 3. Direitos do Titular (LGPD Art. 18)

### 3.1. Direito ao Esquecimento vs. Retenção Legal (Art. 16)
Quando um titular solicitar a exclusão de sua conta:
* **Dados Pessoais Identificáveis (PII):** Devem ser **anonimizados** ou apagados.
* **Ordens de Serviço e Faturas Fiscal/Financeiras:** **NÃO** devem ser apagadas se houver obrigação legal de retenção (ex: Lei 5.172/66 CTN - retenção fiscal por 5 anos).
* **Solução (Pseudo-anonimização):**
  - O documento do Usuário é marcado como `status: 'DELETED'`.
  - Campos identificadores são substituídos:
    - `name`: `"Usuário Anonimizado [LGPD]"`
    - `email`: `deleted_user_12345@anon.local`
    - `cpf`: `"000.000.000-00"`
    - `phone`: `""`

```typescript
// Exemplo de Controller: Exclusão com Anonimização
export const anonymizeUserAccount = async (req: Request, res: Response) => {
  const userId = req.user.id;

  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      name: 'Usuário Anonimizado [LGPD]',
      email: `deleted_${userId}@anon.local`,
      phone: '',
      cpf: '000.000.000-00',
      status: 'DELETED',
      'privacy_consent.accepted': false,
      deleted_at: new Date()
    }
  });

  return res.json({ success: true, message: 'Conta e dados pessoais anonimizados conforme LGPD.' });
};
```

---

### 3.2. Portabilidade dos Dados (Exportação)
O backend deve fornecer um endpoint seguro para exportação dos dados do titular em formato estruturado (JSON/CSV):

```typescript
// GET /api/v1/users/me/export
export const exportUserData = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const user = await UserModel.findById(userId).lean();
  const serviceOrders = await ServiceOrderModel.find({ customer_id: userId }).lean();

  const exportPayload = {
    personal_data: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      cpf: user.cpf,
      created_at: user.createdAt
    },
    service_history: serviceOrders
  };

  return res.json({ success: true, data: exportPayload });
};
```

---

## 4. Higienização de Logs de Auditoria

**REGRA CRÍTICA:** Nenhum log do backend (Winston, Morgan, Console) pode conter dados sensíveis ou senhas em texto puro.

### Máscaras de Logs

Ao registrar requisições ou erros:
* **Senhas & Tokens:** Nunca logar campos `password`, `token`, `refresh_token`, `credit_card`.
* **Dados Pessoais:** Omitir ou mascarar CPFs (`***.456.789-**`) e e-mails (`u***r@domain.com`).

```typescript
// Helper de Sanitização de Payload para Log
export function sanitizeLogPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };

  const sensitiveFields = ['password', 'confirm_password', 'token', 'refreshToken', 'card_number', 'cvv'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) sanitized[field] = '••••••••';
  }

  return sanitized;
}
```

---

## 5. Segurança do Armazenamento e Criptografia

1. **Senhas:** Criptografadas via `bcrypt` com salt factor mínimo de 10.
2. **Tokens JWT:** Access Token (vida curta, ex: 15-60 min) + Refresh Token (armazenado com hash/Redis).
3. **Secrets & Variáveis de Ambiente:** Nenhuma chave de API, string de conexão ou segredo JWT deve estar hardcodada nos repositórios. Usar estritamente `.env`.
4. **Comunicação Segura:** Todas as conexões de banco (MongoDB Atlas / PostgreSQL) e integrações (Mercado Pago, Cloudinary) devem exigir **TLS/SSL**.

---

## 📋 Checklist de Conformidade LGPD (Backend)

- [ ] Registro do consentimento dos Termos e Política de Privacidade no banco de dados (`accepted_at`, `version`, `ip_address`).
- [ ] Endpoint de exportação de dados em formato legível (Portabilidade).
- [ ] Endpoint/Fluxo de desativação e anonimização de dados pessoais (Direito ao Esquecimento).
- [ ] Sanitização e eliminação de senhas e tokens nos logs da aplicação.
- [ ] Retenção legal de registros fiscais/contábeis separada da retenção de dados pessoais marketing.
- [ ] HTTPS e TLS ativados em todos os ambientes de produção e homologação.
