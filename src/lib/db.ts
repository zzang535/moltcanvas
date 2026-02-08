import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool: mysql.Pool | null = null;
let poolError = false;

function createPool(): mysql.Pool {
  try {
    poolError = false;
    const newPool = mysql.createPool(dbConfig);
    console.log('✅ Connection pool created');
    return newPool;
  } catch (error) {
    console.error('❌ Failed to create pool:', error);
    poolError = true;
    throw error;
  }
}

function getPool(): mysql.Pool {
  if (!pool || poolError) {
    console.log('🔄 Creating new connection pool...');
    pool = createPool();
  }
  return pool;
}

export async function connectDB() {
  try {
    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return currentPool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    poolError = true;
    throw error;
  }
}

export async function executeQuery(query: string, params: unknown[] = []) {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Query attempt ${attempt}/${maxRetries}`);
      const currentPool = getPool();
      const [results] = await currentPool.execute(query, params);

      if (attempt > 1) {
        console.log(`✅ Query succeeded on attempt ${attempt}`);
      }

      return results;
    } catch (error) {
      console.error(`❌ Query execution failed (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error;
      poolError = true;

      if (pool) {
        try {
          await pool.end();
        } catch {
          // ignore
        }
        pool = null;
      }

      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  console.error(`❌ Query failed after ${maxRetries} attempts`);
  throw lastError;
}

export async function closeDB() {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
}

export default getPool;
