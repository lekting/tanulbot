import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
import * as Sentry from '@sentry/node';

// Database configuration from environment variables
const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME = 'tanulbot',
  DB_USER = 'tanulbot_user',
  DB_PASSWORD = ''
} = process.env;

// Create TypeORM DataSource
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.DEBUG === 'true',
  entities: [path.join(__dirname, '../entity/**/*.{ts,js}')],
  migrations: [path.join(__dirname, '../migration/**/*.{ts,js}')],
  subscribers: [path.join(__dirname, '../subscriber/**/*.{ts,js}')]
});

// Function to initialize database connection
export async function initDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully.');
  } catch (error) {
    Sentry.captureException(error);
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

export default AppDataSource;
