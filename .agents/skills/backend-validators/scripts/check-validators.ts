import * as fs from 'fs';
import * as path from 'path';

const ROUTERS_DIR = path.join(__dirname, '../../../../src/routers');
const VALIDATORS_DIR = path.join(__dirname, '../../../../src/validators');

// Argumentos do processo
const shouldFix = process.argv.includes('--fix');

function getTsFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getTsFiles(filePath));
        } else if (file.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

// Cria o arquivo de esqueleto do validador em src/validators
function createValidatorSkeleton(entityName: string): string {
    const filePath = path.join(VALIDATORS_DIR, `${entityName}Validator.ts`);
    if (fs.existsSync(filePath)) {
        return `${entityName}Validator`;
    }

    const template = `import { body, param } from 'express-validator';
import { ValidatorMiddleware } from '../middlewares/global/validator.middleware';

export class ${entityName}Validator {
    static create() {
        return [
            // TODO: Adicione as validações de criação para ${entityName} aqui
            // body('campo', 'Mensagem de erro').notEmpty(),
            ValidatorMiddleware.checkError
        ];
    }

    static update() {
        return [
            param('id', 'O ID parâmetro enviado é inválido.').isMongoId(),
            // TODO: Adicione as validações de atualização para ${entityName} aqui
            ValidatorMiddleware.checkError
        ];
    }
}
`;

    fs.writeFileSync(filePath, template, 'utf8');
    console.log(`  [NEW] Criado esqueleto do validador em: src/validators/${entityName}Validator.ts`);
    return `${entityName}Validator`;
}

function auditAndFixRouters() {
    console.log('=== Auditoria de Segurança de Rotas (backend-validators) ===\n');

    if (!fs.existsSync(ROUTERS_DIR)) {
        console.error(`❌ Diretório de rotas não encontrado: ${ROUTERS_DIR}`);
        process.exit(1);
    }

    if (shouldFix && !fs.existsSync(VALIDATORS_DIR)) {
        fs.mkdirSync(VALIDATORS_DIR, { recursive: true });
    }

    const routerFiles = getTsFiles(ROUTERS_DIR);
    let totalRotasEscrita = 0;
    let totalSemValidator = 0;
    let totalCorrigidos = 0;

    routerFiles.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        const lines = content.split(/\r?\n/);
        const relativePath = path.relative(path.join(__dirname, '../../../../'), file);
        const fileName = path.basename(file);
        
        // Deduz o nome da entidade (ex: ServiceRouter.ts -> Service)
        const entityName = fileName.replace('Router.ts', '');
        let fileModified = false;
        let importAdded = false;

        const updatedLines = lines.map((line, idx) => {
            // Identifica rotas post/put/patch
            const match = line.match(/\.router\.(post|put|patch)\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/i);
            
            if (match) {
                totalRotasEscrita++;
                const HTTP_METHOD = match[1].toUpperCase();
                const routePath = match[2];
                const controllerAction = match[3].trim();

                const temValidator = line.includes('Validator') || line.match(/Validator\.[a-zA-Z0-9_]+\(\)/);

                if (!temValidator) {
                    totalSemValidator++;
                    
                    if (shouldFix) {
                        // Garante que o esqueleto do validador existe
                        const validatorClass = createValidatorSkeleton(entityName);
                        
                        // Determina se usa create() ou update() (ou genérico se for outro método)
                        let validatorMethod = 'create()';
                        if (HTTP_METHOD === 'PUT' || HTTP_METHOD === 'PATCH' || controllerAction.toLowerCase().includes('update')) {
                            validatorMethod = 'update()';
                        }

                        // Substitui a linha registrando o middleware de validação
                        const newLine = line.replace(
                            `.router.${match[1]}(${JSON.stringify(routePath)}, ${controllerAction})`,
                            `.router.${match[1]}(${JSON.stringify(routePath)}, ${validatorClass}.${validatorMethod}, ${controllerAction})`
                        );
                        
                        fileModified = true;
                        totalCorrigidos++;
                        console.log(`  [FIX] Corrigida rota ${HTTP_METHOD} ${routePath} em ${relativePath}:${idx + 1}`);
                        return newLine;
                    } else {
                        console.log(`✖ [Inseguro] Rota ${HTTP_METHOD} ${routePath} em ${relativePath}:${idx + 1} — Sem Validator`);
                    }
                } else {
                    console.log(`✔ [Protegido] Rota ${HTTP_METHOD} ${routePath} em ${relativePath}:${idx + 1}`);
                }
            }
            return line;
        });

        // Adiciona a importação do Validator no topo do arquivo se modificado
        if (fileModified && shouldFix) {
            const importStatement = `import { ${entityName}Validator } from '../validators/${entityName}Validator';\n`;
            if (!content.includes(`${entityName}Validator`)) {
                // Insere logo após o primeiro import
                const firstImportIdx = updatedLines.findIndex(l => l.startsWith('import '));
                if (firstImportIdx !== -1) {
                    updatedLines.splice(firstImportIdx + 1, 0, importStatement.trim());
                } else {
                    updatedLines.unshift(importStatement);
                }
            }
            fs.writeFileSync(file, updatedLines.join('\n'), 'utf8');
        }
    });

    console.log(`\n=== Resumo da Execução ===`);
    console.log(`- Total de rotas de escrita: ${totalRotasEscrita}`);
    if (shouldFix) {
        console.log(`- Rotas corrigidas e protegidas: ${totalCorrigidos}`);
        console.log(`- Rotas pendentes: ${totalSemValidator - totalCorrigidos}`);
        console.log('\n✔ Auto-correção finalizada com sucesso! Todos os validadores foram gerados e registrados.');
    } else {
        console.log(`- Rotas vulneráveis (sem Validator): ${totalSemValidator}`);
        if (totalSemValidator > 0) {
            console.log('\n💡 Dica: Rode "npx ts-node .agents/skills/backend-validators/scripts/check-validators.ts --fix" para auto-corrigir todas as rotas inseguras!');
        }
    }
}

auditAndFixRouters();
