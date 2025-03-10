import { HttpModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseService } from './db.service';
import { EmailService } from './emailsender.service';
import { EthService } from './eth.service';
import { HydraService } from './hydra.service';
import { IOService } from './io.service';
import { MonitoringService } from './monitoring.service';
import { AppStateService } from './state.service';

@Module({
  imports: [ConfigModule, HttpModule, ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [
    AppService,
    HydraService,
    EthService,
    IOService,
    DatabaseService,
    MonitoringService,
    EmailService,
    AppStateService,
  ],
})
export class AppModule {}
