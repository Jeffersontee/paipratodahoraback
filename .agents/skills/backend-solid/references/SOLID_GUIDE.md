# 🏛️ Guia Prático de S.O.L.I.D. no Bravo SaaS

Este documento estabelece as diretrizes para a aplicação dos princípios SOLID em nossa arquitetura de software, visando manter o código testável, limpo e escalável.

---

## 1. Single Responsibility Principle (S) — Princípio da Responsabilidade Única

> _"Uma classe/função deve ter um, e apenas um, motivo para mudar."_

### ❌ O que EVITAR (Anti-padrão)

Um único arquivo de middleware (`GlobalMiddleWare.ts`) que valida tokens JWT, resolve conexões de bancos multi-tenant, valida erros do `express-validator` e processa regras de paywall de assinaturas.

### O que FAZER (Padrão correto)

Fatiar o arquivo em módulos menores e especializados, onde cada classe resolve apenas o seu domínio:

- `AuthMiddleware`: Cuida apenas de criptografia e tokens.
- `TenantMiddleware`: Cuida apenas de conexões dinâmicas de banco de dados.
- `SubscriptionMiddleware`: Cuida apenas de regras de negócio de cobrança.

---

## 2. Open/Closed Principle (O) — Princípio Aberto/Fechado

> _"Entidades de software devem estar abertas para extensão, mas fechadas para modificação."_

### ❌ O que EVITAR

Hardcodar planos ou limites no meio dos controladores:

```typescript
const limit = planName === "premium" ? 5 : 0; // Ruim! Se criar um plano novo, quebra.
```

### O que FAZER

Confiar em polimorfismo ou em dados dinâmicos vindos do banco de dados (Schema). O código se adapta a novos planos sem precisar de alteração e novo deploy:

```typescript
const limit = establishment?.subscription_id?.plan_id?.max_banners ?? 0; // Excelente!
```

---

## 3. Liskov Substitution Principle (L) — Princípio da Substituição de Liskov

> _"Objetos de uma superclasse devem ser substituíveis por objetos de suas subclasses sem quebrar a aplicação."_

### Aplicação no Nosso Sistema

Ao estender ou tipar requisições do Express, garantir que o objeto modificado não quebre os métodos nativos do Express. Ao usar herança nos Models do Mongoose (se aplicável), as classes filhas devem honrar os contratos da classe pai.

---

## 4. Interface Segregation Principle (I) — Princípio da Segregação de Interfaces

> _"Uma classe não deve ser forçada a depender de interfaces que não utiliza."_

### Aplicação no Nosso Sistema

Em vez de criar uma interface de tipo gigante contendo todas as propriedades do sistema para injetar no `req` do Express, segregamos por escopo:

```typescript
// Segregado e limpo
interface TenantRequest extends Request {
  establishment?: IEstablishment;
  db?: mongoose.Connection;
}

interface AuthRequest extends Request {
  user?: IUser;
}
```

---

## 5. Dependency Inversion Principle (D) — Princípio da Inversão de Dependência

> _"Dependa de abstrações, não de implementações concretas."_

### Aplicação no Nosso Sistema

Nossos Middlewares e Controllers não devem instanciar utilitários pesados diretamente por baixo dos panos.

#### Exemplo Prático: Estrutura de Serviços (`src/services/`)

Organizamos nossos serviços isolando integrações externas de lógica de negócios core:

```text
src/
└── services/
    ├── stock/                 # Lógica interna de estoque (Core)
    │   └── ...
    ├── integrations/          # Gateways e APIs de terceiros (Implementações Concretas)
    │   ├── Cloudinary.ts
    │   ├── MercadoPago.ts
    │   ├── NodeMailer.ts
    │   ├── PayPal.ts
    │   ├── Razorpay.ts
    │   └── Stripe.ts
    ├── AuditService.ts        # Serviços core do ecossistema
    ├── CronService.ts
    ├── NotificationService.ts
    ├── OrderService.ts
    └── PaymentProvider.ts     # Abstração (DIP) que consome as integrações acima
```

Nesse modelo, `PaymentProvider.ts` funciona como a abstração principal de pagamentos. Os controladores dependem dele, e ele orquestra qual gateway concreto (Stripe, MercadoPago, PayPal, etc.) em `integrations/` processará a operação, garantindo que regras de roteamento e controladores fiquem desacoplados das APIs externas de terceiros.
