// Provisionamento exclusivo do Compose sintético; nenhuma rota da aplicação é alterada.
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import pg from 'pg';
import argon2 from 'argon2';

const privateFile = '/app/homolog-private/credentials.json';
const runtimePassword = process.env.POSTGRES_RUNTIME_PASSWORD || '';
if (process.env.HOMOLOGATION_SYNTHETIC_ONLY !== 'yes' ||
    !/^postgresql:\/\/si_homolog_admin:[a-f0-9]{64}@postgres:5432\/saida_homolog$/.test(process.env.DATABASE_URL || '') ||
    !/^[a-f0-9]{64}$/.test(runtimePassword)) {
  console.error('Configuração recusada. Use somente o Compose de homologação com segredos novos gerados pelo inicializador.');
  process.exit(1);
}
const url = new URL(process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString: url.toString() });
let client;
try {
  let users = (await pool.query('SELECT id, usuario, role, "senhaHash" FROM "Usuario" ORDER BY id')).rows;
  let credentials;
  let fresh = false;
  if (users.length === 0 && !existsSync(privateFile)) {
    const result = spawnSync('npm', ['run', 'prisma:seed'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', SEED_DEFAULT_PASSWORD: randomBytes(32).toString('hex') },
    });
    if (result.status !== 0) throw new Error('seed');
    users = (await pool.query('SELECT id, usuario, role, "senhaHash" FROM "Usuario" ORDER BY id')).rows;
    if (users.length !== 22) throw new Error('unexpected seed');
    credentials = {
      environment: 'synthetic-homologation',
      createdAt: new Date().toISOString(),
      accounts: users.map(u => ({ usuario: u.usuario, role: u.role, senha: randomBytes(24).toString('hex') })),
    };
    fresh = true;
  } else {
    if (!existsSync(privateFile)) throw new Error('missing credentials');
    credentials = JSON.parse(readFileSync(privateFile, 'utf8'));
    if (credentials.environment !== 'synthetic-homologation' || users.length !== 22 || credentials.accounts?.length !== 22)
      throw new Error('inconsistent credentials');
    for (const user of users) {
      const account = credentials.accounts.find(a => a.usuario === user.usuario && a.role === user.role);
      if (!account || !await argon2.verify(user.senhaHash, account.senha)) throw new Error('credentials mismatch');
    }
  }
  client = await pool.connect();
  await client.query('BEGIN');
  const exists = (await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'si_homolog_runtime'")).rowCount > 0;
  const quoted = (await client.query('SELECT quote_literal($1) AS value', [runtimePassword])).rows[0].value;
  await client.query(`${exists ? 'ALTER' : 'CREATE'} ROLE si_homolog_runtime WITH LOGIN PASSWORD ${quoted} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  await client.query(readFileSync(new URL('./runtime-grants.sql', import.meta.url), 'utf8'));
  if (fresh) {
    for (const account of credentials.accounts) {
      const hash = await argon2.hash(account.senha, { type: argon2.argon2id });
      await client.query('UPDATE "Usuario" SET "senhaHash" = $1 WHERE usuario = $2', [hash, account.usuario]);
    }
    writeFileSync(privateFile + '.new', JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  await client.query('COMMIT');
  if (fresh) renameSync(privateFile + '.new', privateFile);
  console.log(fresh
    ? 'Homologação preparada: 22 contas sintéticas com senhas individuais novas; credenciais somente no arquivo privado.'
    : 'Homologação conferida: contas e senhas existentes preservadas.');
  console.log('Papel de runtime restrito; backend não recebe senha de seed nem credencial administrativa.');
} catch {
  if (client) await client.query('ROLLBACK').catch(() => {});
  console.error('Preparação de homologação falhou. Backend permanece bloqueado. Confira volume/arquivo privado correspondentes e permissões; não reutilize banco real. Em bootstrap interrompido, siga a limpeza sintética documentada.');
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
