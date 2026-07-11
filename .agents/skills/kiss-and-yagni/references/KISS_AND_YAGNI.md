# KISS & YAGNI — Guia de Referência

## Definições

### KISS (Keep It Simple, Stupid)
> A simplicidade deve ser um objetivo-chave de design. Complexidade desnecessária deve ser evitada.

### YAGNI (You Aren't Gonna Need It)
> Não implemente funcionalidades até que elas sejam realmente necessárias. "Talvez a gente precise disso" não é justificativa.

---

## Aplicação no Ecossistema Node/Express + Angular/Ionic

### 1. Controllers — Não criar abstrações prematuras

```typescript
// ❌ ERRADO — Over-engineering: Factory pattern para 2 entidades
class ControllerFactory {
  static create(model: string, schema: Schema) {
    return {
      getAll: async (req, res) => { /* genérico */ },
      getById: async (req, res) => { /* genérico */ },
      create: async (req, res) => { /* genérico */ },
    };
  }
}

// ✅ CORRETO — Simples e direto. Se um dia 10 controllers repetirem o padrão, aí refatora.
class UserController {
  static async getAll(req: Request, res: Response) {
    const users = await UserModel.find();
    return res.json({ success: true, data: users });
  }
}
```

### 2. Models — Não adicionar campos "para o futuro"

```typescript
// ❌ ERRADO — YAGNI: campos que "talvez" sejam usados
const UserSchema = new Schema({
  name: String,
  email: String,
  phone: String,
  // "Pode ser que a gente precise disso"
  secondary_email: String,    // Nunca usado
  fax_number: String,         // Sério?
  preferred_language: String, // Overkill para MVP
  timezone: String,           // Desnecessário por agora
  metadata: Schema.Types.Mixed, // "Flexibilidade" que vira bagunça
});

// ✅ CORRETO — Apenas o necessário. Adiciona quando precisar.
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  type: { type: String, enum: ['user', 'admin', 'technician'], default: 'user' },
});
```

### 3. Componentes Angular — Não generalizar prematuramente

```typescript
// ❌ ERRADO — Componente "genérico" para tudo, configurado por 15 inputs
@Component({ selector: 'app-generic-form' })
export class GenericFormComponent {
  fields = input.required<FormFieldConfig[]>();
  layout = input<'horizontal' | 'vertical' | 'grid'>('vertical');
  submitLabel = input<string>('Salvar');
  showCancel = input<boolean>(true);
  validationMode = input<'eager' | 'lazy'>('lazy');
  // ... 10 inputs a mais
}

// ✅ CORRETO — Componente específico e claro
@Component({ selector: 'app-user-form' })
export class UserFormComponent {
  isEditMode = input<boolean>(false);
  isLoading = input<boolean>(false);
  save = output<UserFormData>();
}
```

### 4. Rotas — Não criar endpoints que ninguém consome

```typescript
// ❌ ERRADO — CRUD completo "porque sim"
this.router.get('/', Controller.getAll);
this.router.get('/:id', Controller.getById);
this.router.post('/', Controller.create);
this.router.put('/:id', Controller.replaceAll);   // Ninguém usa PUT
this.router.patch('/:id', Controller.update);
this.router.delete('/:id', Controller.delete);
this.router.get('/:id/history', Controller.getHistory);  // "Um dia vamos precisar"
this.router.post('/:id/duplicate', Controller.duplicate); // "Pode ser útil"

// ✅ CORRETO — Apenas o que o frontend consome
this.router.get('/', Controller.getAll);
this.router.get('/:id', Controller.getById);
this.router.post('/', Controller.create);
this.router.patch('/:id', Controller.update);
this.router.delete('/:id', Controller.delete);
```

---

## Sinais de Alerta (Code Smells)

| Sinal | Princípio Violado | Ação |
|-------|-------------------|------|
| "Vamos criar uma classe base abstrata para..." | KISS | Espere ter 3+ implementações concretas |
| "Talvez no futuro a gente precise de..." | YAGNI | Implemente quando o "futuro" chegar |
| Arquivo com mais de 300 linhas | KISS | Extraia para módulos menores |
| Mais de 5 inputs em um componente | KISS | Componente faz coisas demais |
| Interface com métodos opcionais | YAGNI | Só declare o que é usado |
| Config object com 20+ propriedades | KISS | Divida em configs menores |

---

## Regra de Ouro

> **Três ocorrências**: Antes de abstrair/generalizar, espere ter **pelo menos 3** casos concretos que usem o padrão. Na primeira vez, faça simples. Na segunda, copie e adapte. Na terceira, refatore para abstrair.

---

## Checklist

- [ ] Cada componente/controller tem **uma** responsabilidade clara
- [ ] Não existem campos, endpoints ou inputs "para o futuro"
- [ ] Abstrações genéricas possuem **3+ consumidores** concretos
- [ ] Código pode ser entendido sem ler documentação externa
- [ ] Novos desenvolvedores conseguem navegar o código em < 30 min
