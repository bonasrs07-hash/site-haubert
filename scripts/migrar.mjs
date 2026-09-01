/**
 * Aplica um arquivo .sql no banco do Supabase.
 *
 * Dois caminhos, e ele usa o que estiver disponível:
 *
 *   A) SUPABASE_ACCESS_TOKEN  -> API de gestão (preferido)
 *      Token pessoal do dashboard. Dispensa a senha do banco, é revogável num
 *      clique e não depende de IPv6. O endpoint roda o arquivo como consulta
 *      múltipla, que o Postgres executa numa transação implícita.
 *
 *   B) SUPABASE_DB_URL        -> conexão direta, pelo `pg`
 *      Precisa da senha do banco, credencial bem mais poderosa. Fica como
 *      alternativa para quando a API de gestão não servir.
 *
 * Por que este script existe, em vez de usar a CLI do Supabase:
 *
 *  1. `supabase db execute`, que o INSTALACAO.md mandava rodar, NÃO EXISTE na
 *     CLI 2.x. Era instrução quebrada, nunca testada.
 *  2. `supabase login` recusa o fluxo automático fora de terminal interativo,
 *     e nem `--no-browser` contorna: ele quer TTY.
 *  3. `supabase db push` espera nomes `<timestamp>_nome.sql` e reconcilia
 *     histórico remoto. Os arquivos daqui são `001_`/`002_`, e a 001 foi
 *     aplicada à mão pelo SQL Editor, então o histórico remoto não bate com o
 *     local. Deixar o push reconciliar isso num banco de produção é pedir
 *     surpresa.
 *  4. As migrations deste projeto são idempotentes de propósito (`create table
 *     if not exists`, `drop policy if exists`, `add column if not exists`),
 *     então aplicar direto é seguro e previsível.
 *
 * Uso:
 *   npm run migrar supabase/migrations/002_intencoes_de_reserva.sql
 *   npm run migrar <arquivo> -- --conferir     (não aplica, só mostra)
 *
 * A credencial vem do `.env`, que é ignorado pelo git, e NUNCA é impressa: o
 * que sai no terminal é o destino, sem token e sem senha. Script de migration
 * que ecoa credencial é como senha vai parar em log de CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const arquivo = process.argv[2];
const soConferir = process.argv.includes('--conferir');

if (!arquivo) {
  console.error('Uso: npm run migrar <arquivo.sql> [-- --conferir]');
  process.exit(1);
}
if (!fs.existsSync(arquivo)) {
  console.error('Arquivo não encontrado: ' + arquivo);
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
const token = env.SUPABASE_ACCESS_TOKEN;
const conexao = env.SUPABASE_DB_URL;

if (!token && !conexao) {
  console.error('Falta credencial. Ponha UMA das duas no .env:');
  console.error('');
  console.error('  SUPABASE_ACCESS_TOKEN   (preferido)');
  console.error('    supabase.com/dashboard/account/tokens > Generate new token');
  console.error('    Dispensa a senha do banco, e você revoga quando quiser.');
  console.error('');
  console.error('  SUPABASE_DB_URL');
  console.error('    Project Settings > Database > Connection string > URI, sessão (5432).');
  console.error('    É acesso total ao banco.');
  process.exit(1);
}

const sql = fs.readFileSync(arquivo, 'utf8');

/** O ref do projeto sai da própria URL pública: uma fonte de verdade a menos. */
function refDoProjeto() {
  const bruto = env.PUBLIC_SUPABASE_URL ?? '';
  const achado = bruto.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/);
  return achado ? achado[1] : null;
}

const ref = refDoProjeto();
let destino;

if (token) {
  if (!ref) {
    console.error('Não achei o ref do projeto em PUBLIC_SUPABASE_URL.');
    process.exit(1);
  }
  destino = 'api de gestão > projeto ' + ref;
} else {
  try {
    const u = new URL(conexao);
    destino = u.hostname + u.pathname;
  } catch {
    console.error('SUPABASE_DB_URL não parece uma URL válida.');
    process.exit(1);
  }
}

console.log('arquivo : ' + path.basename(arquivo) + ' (' + sql.length + ' bytes)');
console.log('destino : ' + destino);

if (soConferir) {
  const comandos = sql
    .split('\n')
    .filter((l) => /^\s*(create|alter|drop|insert|comment)\b/i.test(l))
    .map((l) => l.trim().slice(0, 76));
  console.log('');
  console.log('O que este arquivo faz (' + comandos.length + ' comandos):');
  for (const c of comandos) console.log('  ' + c);
  console.log('');
  console.log('Nada foi aplicado. Rode sem --conferir para valer.');
  process.exit(0);
}

let processado = false;

// ---- Caminho A: API de gestão --------------------------------------------
if (token) {
  try {
    const resposta = await fetch('https://api.supabase.com/v1/projects/' + ref + '/database/query', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    const corpo = await resposta.text();

    if (!resposta.ok) {
      console.error('');
      console.error('FALHOU (' + resposta.status + ').');
      console.error('  ' + corpo.slice(0, 400));
      if (resposta.status === 403) {
        console.error('');
        console.error('  403 costuma ser token de outra conta, ou sem acesso a este projeto.');
      }
      process.exit(1);
    }

    console.log('');
    console.log('Aplicado com sucesso.');
    if (corpo && corpo.trim() && corpo.trim() !== '[]') {
      console.log('  retorno: ' + corpo.slice(0, 200));
    }
  } catch (erro) {
    console.error('');
    console.error('FALHOU ao falar com a API de gestão.');
    console.error('  ' + erro.message);
    process.exitCode = 1;
  }
  // Sem `process.exit()` aqui: no Windows ele mata o processo antes de o
  // stdout terminar de escoar e o libuv cospe um "Assertion failed" que não
  // significa nada. Num script de migration, ruído assustador é pior que
  // ruído nenhum: quem lê fica sem saber se o banco entrou ou não.
  processado = true;
}

// ---- Caminho B: conexão direta -------------------------------------------
if (!processado) await aplicarDireto();

async function aplicarDireto() {
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

  console.log('');
  console.log('Aplicado com sucesso.');
} catch (erro) {
  try {
    await cliente.query('rollback');
  } catch {
    // já estava fora de transação
  }
  console.error('');
  console.error('FALHOU, e nada foi aplicado (rollback feito).');
  console.error('  ' + erro.message);
  if (erro.hint) console.error('  dica do Postgres: ' + erro.hint);
  process.exitCode = 1;
} finally {
  await cliente.end().catch(() => {});
}
}
