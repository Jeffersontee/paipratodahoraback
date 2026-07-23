import * as fs from 'fs';
import * as path from 'path';

const projectRoot = process.cwd();
const skillsDir = path.join(projectRoot, '.agents', 'skills');

if (!fs.existsSync(skillsDir)) {
  console.error("❌ Direitório de skills não encontrado.");
  process.exit(1);
}

const skills = fs.readdirSync(skillsDir);
let hasErrors = false;

console.log("🔍 Iniciando Varredura de Conformidade das Agent Skills...\n");

skills.forEach(skill => {
  const skillPath = path.join(skillsDir, skill);
  if (!fs.statSync(skillPath).isDirectory()) return;

  console.log(`Checking skill: [${skill}]`);

  // 1. Validar existência do SKILL.md
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.error(`  ❌ ERRO: Arquivo SKILL.md ausente em ${skill}`);
    hasErrors = true;
    return;
  }

  // 2. Validar Frontmatter YAML mínimo no SKILL.md
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  if (!content.startsWith('---') || !content.includes('name:') || !content.includes('description:')) {
    console.error(`  ❌ ERRO: SKILL.md de [${skill}] não possui metadados YAML válidos.`);
    hasErrors = true;
  }

  // 3. Validar a nova estrutura estrita (Hub + Impeccable)
  const requiredFolders = ['agents', 'references', 'scripts'];
  requiredFolders.forEach(folder => {
    const folderPath = path.join(skillPath, folder);
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      console.error(`  ❌ ERRO: Subpasta obrigatória '${folder}/' ausente em [${skill}]`);
      hasErrors = true;
    }
  });
});

if (hasErrors) {
  console.log("\n❌ Falha na validação. Corrija os erros de arquitetura listados acima.");
  process.exit(1);
} else {
  console.log("\n🎉 Sucesso! Todas as suas skills estão em conformidade com o padrão Hub.");
  process.exit(0);
}
