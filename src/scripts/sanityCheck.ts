import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.resolve(process.cwd(), 'src');
const distDir = path.resolve(process.cwd(), 'dist');

/**
 * Função recursiva para listar todos os arquivos de um diretório
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

async function runCheck() {
    console.log('🔍 Iniciando teste de sanidade: src vs dist (Bravo Backend)...');

    if (!fs.existsSync(distDir)) {
        console.error('❌ Erro: Pasta dist não encontrada. Execute npm run build primeiro.');
        process.exit(1);
    }

    const srcFiles = getAllFiles(srcDir)
        .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'))
        .map(f => path.relative(srcDir, f));

    let errors = 0;

    srcFiles.forEach(file => {
        const expectedJs = file.replace(/\.ts$/, '.js');
        const distPath = path.join(distDir, expectedJs);
        const srcPath = path.join(srcDir, file);

        if (!fs.existsSync(distPath)) {
            console.error(`⚠️  Divergência detectada: ${file} não possui o respectivo compilado em dist.`);
            errors++;
        } else {
            const srcStat = fs.statSync(srcPath);
            const distStat = fs.statSync(distPath);
            if (srcStat.mtime > distStat.mtime) {
                console.error(`⚠️  Build obsoleto: ${file} foi modificado após a última compilação.`);
                errors++;
            }
        }
    });

    if (errors > 0) {
        console.error(`\n❌ Falha na sanidade: ${errors} arquivo(s) em src não foram encontrados ou estão obsoletos no build atual.`);
        process.exit(1);
    } else {
        console.log('✅ Sanidade confirmada: Todos os arquivos de origem TypeScript possuem seus pares JavaScript compilados em dist.');
    }
}

runCheck();
