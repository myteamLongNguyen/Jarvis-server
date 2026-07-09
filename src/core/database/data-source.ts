import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from '../config';

export default new DataSource({
  type: config.database.type,
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  entities: [__dirname + '/../../entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/../../migrations/*.{ts,js}'],
});
