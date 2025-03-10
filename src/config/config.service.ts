import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, Injectable } from '@nestjs/common';

export interface EnvConfig {
  [key: string]: string;
}

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    const test = process.env.NODE_ENV && process.env.NODE_ENV === 'test';
    const envFilePath = path.resolve(
      process.cwd(),
      test ? '.env.test' : '.env',
    );
    this.envConfig = dotenv.parse(fs.readFileSync(envFilePath));
    this.logger.log(`Config read from ${envFilePath}`);
  }

  get waitForConfirmations(): boolean {
    return this.envConfig.SHOULD_WAIT_FOR_CONFIRMATIONS === 'true'
      ? true
      : false;
  }

  get contractOwnerPrivKey(): string {
    return this.envConfig.CONTRACT_OWNER_PRIVATE_KEY;
  }

  get lockHydAddress(): string {
    return this.envConfig.LOCK_HYD_ADDRESS;
  }

  get lockHydUnlockPassword(): string {
    return this.envConfig.LOCK_HYD_UNLOCK_PASSWORD;
  }

  get lockHydMnemonic(): string {
    return this.envConfig.LOCK_HYD_MNEMONIC;
  }

  get hydExplorerHost(): string {
    return this.envConfig.HYD_EXPLORER_HOST;
  }

  get hydExplorerPort(): number {
    return parseInt(this.envConfig.HYD_EXPLORER_PORT, 10);
  }

  get contractAddress(): string {
    return this.envConfig.CONTRACT_ADDRESS.toLowerCase();
  }

  get infuraKey(): string {
    return this.envConfig.INFURA_KEY;
  }

  get ethereumNetwork(): string {
    return this.envConfig.ETHEREUM_NETWORK;
  }

  get connectToTestnet(): boolean {
    return this.envConfig.NETWORK === 'TESTNET';
  }

  get monitoringMailerToAddress(): string {
    return this.envConfig.MONITORING_MAILER_TO_ADDRESS;
  }

  get monitoringMailerHost(): string {
    return this.envConfig.MONITORING_MAILER_HOST;
  }

  get monitoringMailerPort(): number {
    return parseInt(this.envConfig.MONITORING_MAILER_PORT);
  }

  get monitoringMailerFromAddress(): string {
    return this.envConfig.MONITORING_MAILER_FROM_ADDRESS;
  }

  get monitoringMailerFromUser(): string {
    return this.envConfig.MONITORING_MAILER_FROM_USER;
  }

  get monitoringMailerFromPassword(): string {
    return this.envConfig.MONITORING_MAILER_FROM_PASSWORD;
  }

  get monitoringMailerCc(): string {
    return this.envConfig.MONITORING_MAILER_CC;
  }
}
