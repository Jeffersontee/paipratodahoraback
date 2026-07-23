import * as fs from 'fs';
import * as path from 'path';

const args: string[] = process.argv.slice(2);
const skillName: string = args[0];
const skillDesc: string = args[1] || 'Descrição pendente.';

if (!skillName) {
  console.error("ERRO: Forneça o nome da skill. Exemplo: npx ts-node create-skill.ts minha-skill 'Minha descrição'");
  process.exit(1);
}

// O script assume que está sendo rodado a partir da raiz do projeto
const projectRoot: string = process.cwd();
const skillDir: string = path.join(projectRoot, '.agents', 'skills', skillName);

if (fs.existsSync(skillDir)) {
  console.error(`ERRO: A skill '${skillName}' já existe em ${skillDir}.`);
  process.exit(1);
}

// Criar estrutura de pastas padrão TaxSmart + Impeccable
const dirsToCreate: string[] = [
  skillDir,
  path.join(skillDir, 'agents'),      // <-- Nova pasta para os arquivos .toml/.yaml do Impeccable
  path.join(skillDir, 'references'),  // <-- Documentações extensas de apoio
  path.join(skillDir, 'scripts')     // <-- Automações locais em bash/node
];

dirsToCreate.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Pasta criada: ${dir}`);
});

// Template do SKILL.md (Formato Roteador de Gatilho Curto do TaxSmart)
const skillMdContent: string = `---
name: ${skillName}
description: ${skillDesc}
---

# ${skillName.replace(/-/g, ' ').toUpperCase()}

Este arquivo atua estritamente como roteador e gatilho de ativação do ecossistema. 

## Referências e Dependências Técnicas
* **Agentes Operacionais:** Consulte \`.agents/skills/${skillName}/agents/\` para configurações e loops executáveis.
* **Bases de Conhecimento:** Consulte \`.agents/skills/${skillName}/references/\` para guias técnicos profundos.
* **Automações de Desenvolvimento:** Consulte \`.agents/skills/${skillName}/scripts/\` para utilitários CLI.
`;

fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMdContent);
console.log(`Arquivo SKILL.md gerado com sucesso.`);

// Arquivo de referência base
const refContent: string = `# Documentação de Referência: ${skillName}

Este arquivo armazena a documentação longa, explicações arquiteturais e detalhes de implementação complexos.
Mantenha o \`SKILL.md\` limpo e adicione novas diretrizes detalhadas como novos arquivos markdown nesta pasta \`references/\`.
`;

fs.writeFileSync(path.join(skillDir, 'references', 'docs.md'), refContent);
console.log(`Arquivo references/docs.md gerado com sucesso.`);

console.log(`\n🎉 Skill '${skillName}' orquestrada e criada com sucesso no padrão TaxSmart!`);
