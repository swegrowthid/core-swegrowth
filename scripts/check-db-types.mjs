// Cocokkan tipe tulisan tangan di app/lib/database.types.ts dengan skema hasil
// supabase/migrations/*.sql. Jalankan terhadap database Postgres KOSONG:
//
//   DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run check:db-types
//
// Script menerapkan scripts/supabase-stub.sql + semua migration, lalu
// membandingkan setiap tabel di schema public: nama kolom harus sama persis dan
// kolom yang boleh NULL di database harus bertipe `| null` di TypeScript
// (dan sebaliknya). Tipe nilainya sendiri (string, union status, jsonb) tidak
// dicek karena memang sengaja lebih spesifik daripada hasil generator.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL belum diisi (harus menunjuk ke database Postgres kosong).');
  process.exit(2);
}

const psql = (args) =>
  execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-q', ...args], {
    encoding: 'utf8',
    env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' },
  });

const migrations = readdirSync(path.join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort();
psql(['-f', path.join(root, 'scripts/supabase-stub.sql')]);
for (const f of migrations) psql(['-f', path.join(root, 'supabase/migrations', f)]);

/** @type {Map<string, Map<string, boolean>>} tabel → kolom → nullable */
const db = new Map();
const rows = psql([
  '-At',
  '-F',
  '\t',
  '-c',
  `select c.table_name, c.column_name, c.is_nullable = 'YES'
     from information_schema.columns c
     join information_schema.tables t using (table_schema, table_name)
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
    order by 1, c.ordinal_position`,
]);
for (const line of rows.trim().split('\n')) {
  const [table, column, nullable] = line.split('\t');
  if (!db.has(table)) db.set(table, new Map());
  db.get(table).set(column, nullable === 't');
}

// Baca Database['public']['Tables'][T]['Row'] lewat type checker TypeScript.
const typesFile = path.join(root, 'app/lib/database.types.ts');
const program = ts.createProgram([typesFile], { strict: true, noEmit: true });
const checker = program.getTypeChecker();
const source = program.getSourceFile(typesFile);
const dbSymbol = checker.getExportsOfModule(checker.getSymbolAtLocation(source)).find((s) => s.name === 'Database');
const prop = (type, name) => checker.getTypeOfSymbol(checker.getPropertyOfType(type, name));
const tablesType = prop(prop(checker.getDeclaredTypeOfSymbol(dbSymbol), 'public'), 'Tables');

/** @type {Map<string, Map<string, boolean>>} */
const declared = new Map();
for (const table of checker.getPropertiesOfType(tablesType)) {
  const row = prop(checker.getTypeOfSymbol(table), 'Row');
  const columns = new Map();
  for (const col of checker.getPropertiesOfType(row)) {
    const type = checker.getTypeOfSymbol(col);
    const nullable = type.isUnion() ? type.types.some((t) => t.flags & ts.TypeFlags.Null) : !!(type.flags & ts.TypeFlags.Null);
    columns.set(col.name, nullable);
  }
  declared.set(table.name, columns);
}

const problems = [];
for (const table of new Set([...db.keys(), ...declared.keys()])) {
  const actual = db.get(table);
  const typed = declared.get(table);
  if (!typed) {
    problems.push(`${table}: ada di migration tapi tidak ada di Database['public']['Tables']`);
    continue;
  }
  if (!actual) {
    problems.push(`${table}: ada di database.types.ts tapi tidak dibuat oleh migration`);
    continue;
  }
  for (const [column, nullable] of actual) {
    if (!typed.has(column)) problems.push(`${table}.${column}: kolom belum ada di tipe Row`);
    else if (typed.get(column) !== nullable)
      problems.push(
        `${table}.${column}: database ${nullable ? 'boleh NULL' : 'NOT NULL'}, tipe TS ${typed.get(column) ? 'pakai' : 'tanpa'} | null`,
      );
  }
  for (const column of typed.keys())
    if (!actual.has(column)) problems.push(`${table}.${column}: ada di tipe Row tapi tidak ada di database`);
}

if (problems.length) {
  console.error(`database.types.ts tidak cocok dengan migration (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`database.types.ts cocok dengan ${migrations.length} migration (${db.size} tabel).`);
