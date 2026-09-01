/**
 * Aplica um arquivo .sql no banco do Supabase.
 *
 * Por que este script existe, em vez de `supabase db push`:
 *
 *  1. O `INSTALACAO.md` mandava rodar `supabase db execute --file ...`, e esse
 *     subcomando NÃO EXISTE na CLI 2.x. Era instrução quebrada.
 *  2. O `db push` carrega a semântica de histórico de migrations e espera
 *     nomes no formato `<timestamp>_nome.sql`. Os arquivos deste projeto são
 *     `001_`, `002_`, e a 001 já foi aplicada à mão pelo SQL Editor, então o
 *     histórico remoto não bate com o local. Deixar o push reconciliar isso
 *     seria pedir surpresa num banco de produção.
 *  3. As migrations daqui são idempotentes de propósito (`create table if not
 *     exists`, `drop policy if exists`, `add column if not exists`), então
 *     aplicar direto é seguro e previsível.
 *
 * Uso:
 *   node scripts/migrar.mjs supabase/migrations/002_intencoes_de_reserva.sql
 *   node scripts/migrar.mjs <arquivo> --conferir    (não aplica, só mostra)
 *
 * A conexão vem de `SUPABASE_DB_URL` no `.env`, que é ignorado pelo git. A
 * string NUNCA é impressa: o que sai no terminal é host e banco, sem a senha.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const arquivo = process.argv[2];
const soConferir = process.argv.includes('--conferir');

if (!arquivo) {
  console.error('Uso: node scripts/migrar.mjs <arquivo.sql> [--conferir]');
  process.exit(1);
}
if (!fs.existsSync(arquivo)) {
  console.error(`Arquivo não encontrado: ${arquivo}`);
  process.exit(1);
}

/** Lê o .env sem depender de dependência nova. */
function lerEnv() {
  if (!fs.existsSync('.env')) return {};
  return Object.fromEntries(
    fs
      .readFileSync('.env', 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

const env = { ...lerEnv(), ...process.env };
const conexao = env.SUPABASE_DB_URL;

if (!conexao) {
  console.error('Falta SUPABASE_DB_URL no .env.');
  console.error('Pegue em: Supabase > Project Settings > Database > Connection string > URI');
  console.error('Use a de sessão (porta 5432). A de transação (6543) não serve para DDL.');
  process.exit(1);
}

const sql = fs.readFileSync(arquivo, 'utf8');

// Host e banco saem no log; a senha não. Um script de migration que ecoa a
// string de conexão inteira é como senha vai parar em log de CI.
let descricao = 'destino desconhecido';
try {
  const u = new URL(conexao);
  descricao = `${u.hostname}${u.pathname}`;
} catch {
  console.error('SUPABASE_DB_URL não parece uma URL válida.');
  process.exit(1);
}

console.log(`arquivo : ${path.basename(arquivo)} (${sql.length} bytes)`);
console.log(`destino : ${descricao}`);

if (soConferir) {
  const comandos = sql
    .split('\n')
    .filter((l) => /^\s*(create|alter|drop|insert|comment)\b/i.test(l))
    .map((l) => l.trim().slice(0, 76));
  console.log(`\nO que este arquivo faz (${comandos.length} comandos):`);
  for (const c of comandos) console.log('  ' + c);
  console.log('\nNada foi aplicado. Rode sem --conferir para valer.');
  process.exit(0);
}

const cliente = new pg.Client({
  connectionString: conexao,
  ssl: { rejectUnauthorized: false },
  // Migration que trava sem dizer nada é pior que migration que falha.
  connectionTimeoutMillis: 20000,
  statement_timeout: 120000,
});

try {
  await cliente.connect();
  console.log('conexão: ok');

  // Uma transação só: ou o arquivo inteiro entra, ou nada entra. Migration
  // aplicada pela metade é o estado mais caro de consertar.
  await cliente.query('begin');
  await cliente.query(sql);
  await cliente.query('commit');

  console.log('\nAplicado com sucesso.');
} catch (erro) {
  try {
    await cliente.query('rollback');
  } catch {
    // já estava fora de transação
  }
  console.error('\nFALHOU, e nada foi aplicado (rollback feito).');
  console.error(`  ${erro.message}`);
  if (erro.hint) console.error(`  dica do Postgres: ${erro.hint}`);
  process.exitCode = 1;
} finally {
  await cliente.end().catch(() => {});
}
