/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Ignora a pasta de build para evitar execução duplicada de testes compilados (.js)
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  // Define a raiz dos testes como a pasta src
  roots: ['<rootDir>/src'],
  // Define o padrão de nomenclatura de arquivos que o Jest deve considerar como teste
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  // Limpa automaticamente as chamadas e instâncias de mocks entre cada teste
  clearMocks: true,
  // Desativa a coleta de cobertura de código por padrão para manter a velocidade (ative se necessário)
  collectCoverage: false,
};
