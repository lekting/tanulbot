# TanulBot MySQL Database Integration

This guide explains how to set up and use the MySQL database integration for the TanulBot application.

## Prerequisites

- MySQL 5.7+ or MariaDB 10.3+ server
- Node.js 18+ with npm or pnpm

## Database Setup

1. Install MySQL server if you don't have it already:

   ```bash
   # For Ubuntu/Debian
   sudo apt install mysql-server

   # For Windows
   # Download and install from https://dev.mysql.com/downloads/installer/
   ```

2. Create a database and user for TanulBot:

   ```sql
   CREATE DATABASE tanulbot;
   CREATE USER 'tanulbot_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON tanulbot.* TO 'tanulbot_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. Configure the application to use your MySQL database by setting the environment variables in the `.env` file:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=tanulbot
   DB_USER=tanulbot_user
   DB_PASSWORD=your_secure_password
   ```

## Running Database Migrations

The application uses TypeORM for database management and migrations:

1. Run database schema migrations:

   ```bash
   npm run migrate
   # or with pnpm
   pnpm migrate
   ```

2. If you need to migrate data from an existing JSON-based storage to the MySQL database:
   ```bash
   npm run migrate-data
   # or with pnpm
   pnpm migrate-data
   ```

## Database Structure

The database includes the following tables:

1. `users` - Stores user information
2. `chat_messages` - Stores chat history
3. `vocabulary_entries` - Stores user vocabulary words
4. `diary_entries` - Stores user diary entries
5. `invoices` - Stores subscription information
6. `llm_requests` - Logs AI model usage
7. `topic_study_responses` - Caches LLM responses for topic study mode

## Backup and Restore

### Creating a Database Backup

```bash
# For MySQL
mysqldump -u tanulbot_user -p tanulbot > tanulbot_backup.sql

# For MariaDB
mariadb-dump -u tanulbot_user -p tanulbot < tanulbot_backup.sql
```

### Restoring from Backup

```bash
# For MySQL
mysql -u tanulbot_user -p tanulbot < tanulbot_backup.sql

# For MariaDB
mariadb -u tanulbot_user -p tanulbot < tanulbot_backup.sql
```

## Maintenance Tasks

TanulBot includes a maintenance worker that automatically performs these tasks:

1. **Clearing old topic study responses** - Automatically removes cached responses older than 30 days to keep the database size in check

To run maintenance tasks manually:

```bash
# In Node.js application code
await databaseService.clearOldTopicStudyResponses();
```

## Troubleshooting

1. **Connection Issues**: Make sure the MySQL server is running and accessible:

   ```bash
   # For Ubuntu/Debian
   sudo systemctl status mysql

   # For Windows
   net start mysql
   ```

2. **Permission Issues**: Verify that the database user has the correct permissions:

   ```sql
   SHOW GRANTS FOR 'tanulbot_user'@'localhost';
   ```

3. **Database Logs**: Check the MySQL error logs for any issues:

   ```bash
   # For Ubuntu/Debian
   sudo tail -f /var/log/mysql/error.log

   # For Windows
   # Check the MySQL data directory for error logs
   ```

## Performance Optimization

For improved performance:

1. Add appropriate indexes to frequently queried columns
2. Consider using connection pooling
3. Optimize queries for large datasets
4. Consider regular database maintenance (vacuum, analyze)
5. Utilize the caching system for LLM responses to reduce API costs
