import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from '../config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: config.database.type,
        host: config.database.host,
        port: config.database.port,
        username: config.database.username,
        password: config.database.password,
        database: config.database.database,
        synchronize: false,
        migrationsRun: false,
        entities: [__dirname + '/../../entities/*.entity.{ts,js}'],
        migrations: [__dirname + '/../../migrations/*.{ts,js}'],
      }),
    }),
  ],
})
export class DatabaseModule {}
