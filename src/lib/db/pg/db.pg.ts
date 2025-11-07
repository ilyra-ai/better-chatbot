import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Validação da variável de ambiente
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "❌ POSTGRES_URL or DATABASE_URL environment variable is not set. " +
    "Please add it to your .env file."
  );
}

// Criar pool de conexões
const pool = new Pool({
  connectionString,
});

// Criar instância do Drizzle
export const pgDb = drizzlePg(pool);

// Opcional: testar conexão
pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});