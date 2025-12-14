import { Sequelize } from 'sequelize';

let sequelize;

if (process.env.NODE_ENV === 'production') {
  if (process.env.DB_DIALECT === 'mysql' || process.env.MYSQL_URL) {
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      }
    );
  } else {
    // Fallback or specific setup for other prod environments (not recommended for serverless)
    sequelize = new Sequelize(
      process.env.DB_NAME || 'old_book_platform',
      process.env.DB_USER || 'root',
      process.env.DB_PASS || null,
      {
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false,
      }
    );
  }
} else {
  if (!global.sequelize) {
    global.sequelize = new Sequelize(
      {
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false,
      }
    );
  }
  sequelize = global.sequelize;
}

export default sequelize;
