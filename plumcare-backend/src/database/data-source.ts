import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities } from './entities/index.js';

const getDatabaseUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/plumcare'
  );
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  entities: Object.values(entities),
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('Database connection established');
  }
  return AppDataSource;
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
};
