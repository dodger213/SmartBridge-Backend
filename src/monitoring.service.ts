import { Logger, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailService } from './emailsender.service';
import { IOService } from './io.service';
import { AppStateService } from './state.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly ioService: IOService,
    private readonly emailService: EmailService,
    private readonly appStateService: AppStateService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkBalances(): Promise<void> {
    try {
      this.logger.debug('Checking balances...');
      const balances = await Promise.all([
        this.ioService.getWHYDContractBalance(),
        this.ioService.getLockHydAddressBalance(),
      ]);
      const wHydBalance = balances[0];
      const hydBalance = balances[1];

      this.logger.debug(`WHYD balance is ${wHydBalance}`);
      this.logger.debug(`HYD balance is ${hydBalance}`);

      if (wHydBalance > hydBalance) {
        if (this.appStateService.isApiEnabled()) {
          this.logger.log(`WHYD balance is ${wHydBalance}`);
          this.logger.log(`HYD balance is ${hydBalance}`);
          this.logger.log('Disabling API');
          this.appStateService.disableApi();
          await this.emailService.send(
            '!!! WARNING !!! More WHYD in the contract than HYD available',
            `<table style="border: 1px solid">
              <tr>
                <th>WHYD Balance (flake)</th>
                <th>HYD Balance (flake)</th>
              </tr>
              <tr>
                <td>${wHydBalance}</td>
                <td>${hydBalance}</td>
              </tr>
            </table>`,
          );
          this.logger.error(`WHYD balance is ${wHydBalance}`);
          this.logger.error(`HYD balance is ${hydBalance}`);
        }
      } else if (!this.appStateService.isApiEnabled()) {
        this.logger.log('Enabling API');
        this.appStateService.enableApi();
      }
    } catch (e) {
      this.logger.error(`Could not check balances: ${e}`);
    }
  }
}
