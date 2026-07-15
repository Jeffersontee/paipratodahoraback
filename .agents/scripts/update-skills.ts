import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../skills');

/**
 * Agente Script para Padronização de Skills (Backend).
 * Verifica todas as pastas dentro de .agents/skills.
 * Garante que o SKILL.md tenha frontmatter e aponte para um arquivo na pasta /references/
 */
function updateSkills(): void {
    console.log('[Skill Agent] Verificando padronização de Skills no Backend...\n');
    
    if (!fs.existsSync(SKILLS_DIR)) {
        console.error('Diretório de skills não encontrado:', SKILLS_DIR);
        return;
    }

    const skills: string[] = fs.readdirSync(SKILLS_DIR).filter((file: string) => {
        return fs.statSync(path.join(SKILLS_DIR, file)).isDirectory();
    });

    skills.forEach((skillName: string) => {
        const skillPath: string = path.join(SKILLS_DIR, skillName);
        const skillMdPath: string = path.join(skillPath, 'SKILL.md');
        const referencesDir: string = path.join(skillPath, 'references');
        
        // Verifica se a skill possui pasta references
        if (!fs.existsSync(referencesDir)) {
            console.log(`[!] Skill '${skillName}' não possui pasta 'references'. Criando...`);
            fs.mkdirSync(referencesDir, { recursive: true });
        }

        // Lê referências disponíveis
        const references: string[] = fs.readdirSync(referencesDir).filter((file: string) => file.endsWith('.md'));
        
        if (references.length === 0) {
            console.log(`[!] Skill '${skillName}' possui pasta 'references' mas está vazia. Pulo.`);
            return;
        }

        const mainReference: string = references[0]; // Pega a primeira referência
        // Ajustado para o caminho do backend
        const refPathNormalized: string = `file:///c:/workspace/adegaspinguinsV2/adegapinguinsback/.agents/skills/${skillName}/references/${mainReference}`;

        // Lê ou cria o SKILL.md
        let frontmatter: string = `---
name: ${skillName}
description: Diretrizes de padronização para a skill ${skillName}.
---`;
        
        let existingContent: string = '';
        if (fs.existsSync(skillMdPath)) {
            existingContent = fs.readFileSync(skillMdPath, 'utf8');
            // Extrai frontmatter existente se houver
            const match = existingContent.match(/^---\n([\s\S]*?)\n---/);
            if (match) {
                frontmatter = `---
${match[1]}
---`;
            }
        }

        const newSkillMdContent: string = `${frontmatter}

Esta skill fornece diretrizes sobre **${skillName}**.

Por favor, leia a documentação completa no arquivo de referência:
[${mainReference}](${refPathNormalized})
`;

        fs.writeFileSync(skillMdPath, newSkillMdContent, 'utf8');
        console.log(`[✓] Skill '${skillName}' padronizada com sucesso apontando para ${mainReference}.`);
    });

    console.log('\n[Skill Agent] Verificação concluída.');
}

updateSkills();
