import 'reflect-metadata';
import { AppDataSource } from './config/database';

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connection established.');

    console.log('Running migrations...');
    const migrations = await AppDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('No migrations to run. Database is up to date.');
    } else {
      console.log(`Successfully ran ${migrations.length} migrations:`);
      migrations.forEach((migration) => {
        console.log(`- ${migration.name}`);
      });
    }

    console.log('Migration process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migration
runMigrations();
