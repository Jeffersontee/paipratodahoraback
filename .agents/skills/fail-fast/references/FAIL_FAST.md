# Fail Fast — Guia de Referência

## Definição

O princípio **Fail Fast** determina que um sistema deve reportar falhas **o mais cedo possível**, na camada mais externa, antes que dados inválidos se propaguem para camadas internas (serviços, banco de dados, filas).

## Por que é importante?

1. **Debugging mais rápido**: Erros são capturados na borda, com stack traces limpos
2. **Segurança**: Dados malformados nunca chegam ao banco
3. **Performance**: Evita processamento desnecessário de requisições inválidas
4. **UX**: O usuário recebe feedback imediato e específico

---

## Padrões no Ecossistema Node/Express

### 1. Early Return em Controllers

```typescript
// ❌ ERRADO — Processamento profundo antes de validar
static async createOrder(req: Request, res: Response) {
  const order = await OrderService.create(req.body);
  if (!order.user_id) { // Falha tardia
    return res.status(400).json({ message: 'Usuário obrigatório' });
  }
}

// ✅ CORRETO — Fail Fast na borda
static async createOrder(req: Request, res: Response) {
  const { user_id, items } = req.body;
  
  if (!user_id) return res.status(400).json({ message: 'Usuário obrigatório' });
  if (!items?.length) return res.status(400).json({ message: 'Itens obrigatórios' });
  
  const order = await OrderService.create(req.body);
  return res.status(201).json({ success: true, data: order });
}
```

### 2. Validação na Camada de Middleware (express-validator)

```typescript
// Validar ANTES de chegar ao controller
export class OrderValidator {
  static create() {
    return [
      body('user_id').notEmpty().withMessage('Usuário obrigatório').isMongoId(),
      body('items').isArray({ min: 1 }).withMessage('Ao menos 1 item obrigatório'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantidade inválida'),
    ];
  }
}

// No router
this.router.post('/',
  GlobalMiddleWare.auth,
  OrderValidator.create(),
  GlobalMiddleWare.handleValidationErrors, // Fail fast aqui
  OrderController.create
);
```

### 3. Guards no Frontend (Angular)

```typescript
// Guard que falha rápido antes de carregar a página
export const authGuard = async (route: Route) => {
  const auth = inject(AuthService);
  const token = await auth.getToken();
  
  if (!token) {
    inject(Router).navigate(['/login']);
    return false; // Fail fast — nem carrega o componente
  }
  return true;
};
```

### 4. Assertions em Serviços

```typescript
class StockService {
  static async decrementStock(itemId: string, quantity: number, db: Connection) {
    // Fail fast — validar pré-condições antes de qualquer operação
    if (!itemId) throw new Error('itemId é obrigatório');
    if (quantity <= 0) throw new Error('Quantidade deve ser positiva');
    
    const item = await db.model('items', Item.schema).findById(itemId);
    if (!item) throw new Error(`Item ${itemId} não encontrado`);
    if (item.stock < quantity) throw new Error(`Estoque insuficiente: ${item.stock} < ${quantity}`);
    
    // Só executa se todas as pré-condições passarem
    item.stock -= quantity;
    return item.save();
  }
}
```

---

## Checklist de Aplicação

- [ ] Todas as validações de input estão nos **middlewares/validators**, não nos controllers
- [ ] Controllers usam **early return** para condições de erro
- [ ] Serviços validam **pré-condições** com assertions antes de executar lógica
- [ ] Guards do Angular bloqueiam rotas **antes** de carregar componentes
- [ ] Erros retornam **mensagens específicas** (não genéricas tipo "Erro interno")
- [ ] Operações de banco **nunca** recebem dados sem validação prévia

---

## Anti-Padrões a Evitar

| Anti-Padrão | Problema | Solução |
|-------------|----------|---------|
| `try/catch` genérico silencioso | Engole erros, dificulta debugging | Relançar com contexto ou logar |
| Validação dentro do Model | Erro aparece só ao salvar | Validar no middleware |
| `if/else` profundamente aninhado | Difícil de ler, erro se perde | Early return |
| Ignorar retorno de função async | Operação falha silenciosamente | Sempre `await` + error handling |
