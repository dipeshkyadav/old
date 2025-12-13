import { Sequelize } from 'sequelize';

let sequelize;

const dbName = process.env.DB_NAME || 'old_book_platform';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASS || null;
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbDialect = process.env.DB_DIALECT || 'sqlite'; // 'mysql', 'postgres', 'sqlite'

if (process.env.NODE_ENV === 'production') {
  if (dbDialect === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database.sqlite',
      logging: false,
    });
  } else {
    sequelize = new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      dialect: dbDialect,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
} else {
  if (!global.sequelize) {
    if (dbDialect === 'sqlite') {
      global.sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE || './database.sqlite',
        logging: false,
      });
    } else {
      global.sequelize = new Sequelize(dbName, dbUser, dbPassword, {
        host: dbHost,
        dialect: dbDialect,
        logging: false,
      });
    }
  }
  sequelize = global.sequelize;
}

export default sequelize;
