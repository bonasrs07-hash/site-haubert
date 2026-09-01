/**
 * Configuração do Vitest.
 *
 * Existe por um motivo só, e ele é chato o suficiente para merecer arquivo:
 * o alias `@/` vem do `tsconfig.json` e o Astro o resolve no build, mas o
 * Vitest roda fora do Astro e não sabe dele. Sem isto, todo módulo testável
 * que importe `@/algo` quebra o teste com "Cannot find package", e a saída
 * culpa o arquivo errado.
 *
 * Os testes antigos passavam por acaso: usavam import relativo.
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
