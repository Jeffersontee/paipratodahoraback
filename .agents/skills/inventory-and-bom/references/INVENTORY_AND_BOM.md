# Inventory & BOM (Bill of Materials) — Guia de Referência

## Definição

**BOM (Bill of Materials)** é a estrutura que define a receita/composição de um produto a partir de insumos base. O **Estoque Virtual** é calculado dinamicamente a partir do estoque real dos insumos, determinando quantas unidades de um produto podem ser produzidas.

---

## Fórmula do Estoque Virtual

```
Estoque_Virtual(Produto) = Min(
  Estoque_Insumo_A / Qtd_Usada_A,
  Estoque_Insumo_B / Qtd_Usada_B,
  ...
)
```

### Exemplo Prático

| Insumo | Estoque Real | Uso por Porção | Porções Possíveis |
|--------|-------------|----------------|-------------------|
| Batata | 1500g | 150g | 10 |
| Ovo Cozido | 8 unid | 4 unid | 2 |

**Estoque Virtual da Porção = Min(10, 2) = 2 porções**

> O gargalo (bottleneck) define o limite. Não importa ter 1500g de batata se só há ovos para 2 porções.

---

## Compartilhamento de Insumos entre Produtos

Insumos são **globais** — o estoque é compartilhado entre todos os produtos que os utilizam. O cálculo é feito **em tempo real** (on-the-fly), sem pré-alocação.

### Exemplo de Compartilhamento

```
Ovo Cozido: 8 unidades em estoque

Produto A (Salada Caesar): usa 2 ovos → pode fazer 4 porções
Produto B (Batata Recheada): usa 4 ovos → pode fazer 2 porções

Se vender 1 Batata Recheada:
  Ovo Cozido: 8 - 4 = 4 restantes
  Salada Caesar agora pode fazer: 4/2 = 2 porções (antes era 4)
  Batata Recheada agora pode fazer: 4/4 = 1 porção (antes era 2)
```

---

## Modelo de Dados (Mongoose)

### Schema do Insumo

```typescript
const ItemSchema = new Schema({
  name: { type: String, required: true },
  unit: { type: String, enum: ['g', 'kg', 'ml', 'l', 'unid'], required: true },
  stock: { type: Number, default: 0 },
  min_stock: { type: Number, default: 0 }, // Alerta de reposição
  cost_per_unit: { type: Number, default: 0 },
  category_id: { type: Schema.Types.ObjectId, ref: 'categories' },
});
```

### Schema da Receita (dentro da Variação do Produto)

```typescript
const RecipeIngredientSchema = new Schema({
  item_id: { type: Schema.Types.ObjectId, ref: 'items', required: true },
  quantity: { type: Number, required: true }, // Quantidade usada por porção
});

const VariationSchema = new Schema({
  type_id: { type: Schema.Types.ObjectId, ref: 'product_types' },
  size_id: { type: Schema.Types.ObjectId, ref: 'product_sizes' },
  price: Number,
  cost: Number,
  stock: Number, // Estoque manual (override) — ignorado se tem receita
  recipe: [RecipeIngredientSchema], // Se presente, estoque é virtual
});
```

---

## Cálculo no Backend

```typescript
static calculateVirtualStock(variation: any, items: any[]): number {
  if (!variation.recipe?.length) return variation.stock || 0;

  let minPortions = Infinity;

  for (const ingredient of variation.recipe) {
    const item = items.find(i => i._id.toString() === ingredient.item_id.toString());
    if (!item) return 0; // Insumo não encontrado → estoque zero

    const portions = Math.floor(item.stock / ingredient.quantity);
    minPortions = Math.min(minPortions, portions);
  }

  return minPortions === Infinity ? 0 : minPortions;
}
```

---

## Dashboard de Consumo (Relatório)

O relatório de insumos deve exibir:

1. **Top Insumos Consumidos** — Gráfico de barras com volume total gasto
2. **Alertas de Estoque Baixo** — Insumos abaixo do `min_stock`
3. **Matriz Insumo × Produto** — Quais produtos usam cada insumo
4. **Sugestão de Reposição** — `max(0, min_stock - stock_atual)`
5. **Custo de Produção** — `sum(ingredient.quantity * item.cost_per_unit)`

---

## Checklist

- [ ] Variações com `recipe[]` usam estoque virtual (calculado, não manual)
- [ ] Insumos são compartilhados entre produtos (sem pré-alocação)
- [ ] Decremento de estoque ocorre nos **insumos**, não na variação
- [ ] Alerta de estoque baixo é baseado em `min_stock`
- [ ] Dashboard mostra matriz Insumo × Produto
- [ ] Cancelamento de pedido restaura estoque dos insumos
