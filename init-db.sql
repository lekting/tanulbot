-- Initialize MySQL database for TanulBot
-- This script will run automatically when the MySQL container is first created

CREATE DATABASE IF NOT EXISTS tanulbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions to the tanulbot_user
GRANT ALL PRIVILEGES ON tanulbot.* TO 'tanulbot_user'@'%';
FLUSH PRIVILEGES; 