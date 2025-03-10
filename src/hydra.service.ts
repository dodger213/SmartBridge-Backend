import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Crypto } from '@internet-of-people/sdk';
import { hashAddress } from './utils';
import { IOService } from './io.service';
import { ConfigService } from './config/config.service';

@Injectable()
export class HydraService {
  private readonly lockHydAddress: string;
  private readonly lockHydVaultPassword: string;

  constructor(
    private readonly ioService: IOService,
    private readonly configService: ConfigService,
  ) {
    this.lockHydAddress = this.configService.lockHydAddress;
    this.lockHydVaultPassword = this.configService.lockHydUnlockPassword;
  }

  public async validateHydTxAndGetAmount(
    hydTxId: string,
    swapTargetEthAddress: string,
  ): Promise<BigInt> {
    let tx: any;
    try {
      tx = await this.ioService.getHydraTx(hydTxId);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }

    this.validateHydTx(tx, hydTxId, swapTargetEthAddress);

    const expectedConfirmations = this.configService.waitForConfirmations
      ? 53
      : 1;
    if (tx.data.data.confirmations < expectedConfirmations) {
      throw new BadRequestException(
        `Tx must be well confirmed (53 or more). Current confirmations: ${tx.data.data.confirmations}`,
      );
    }

    return BigInt(tx.data.data.amount);
  }

  public async sendHyd(
    swapTargetHydAddress: string,
    amountFlake: BigInt,
  ): Promise<string> {
    try {
      const vault = Crypto.Vault.create(
        this.configService.lockHydMnemonic,
        '',
        this.lockHydVaultPassword,
      );

      const network = this.configService.connectToTestnet
        ? Crypto.Coin.Hydra.Testnet
        : Crypto.Coin.Hydra.Mainnet;
      const hydraParams = new Crypto.HydraParameters(network, 0);
      Crypto.HydraPlugin.rewind(vault, this.lockHydVaultPassword, hydraParams);
      const hydraAccount = Crypto.HydraPlugin.get(vault, hydraParams);
      const lockAddress = hydraAccount.pub.key(0).address;

      return await this.ioService.sendHydraTransferTx(
        lockAddress,
        swapTargetHydAddress,
        amountFlake,
        hydraAccount,
      );
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  private validateHydTx(
    tx: any,
    hydTxId: string,
    swapTargetEthAddress: string,
  ): void {
    if (tx.status !== 200) {
      throw new NotFoundException(`Tx ${hydTxId} cannot be found`);
    }

    if (
      !tx.data ||
      !tx.data.data ||
      tx.data.data.typeGroup !== 1 ||
      tx.data.data.type !== 0 ||
      !tx.data.data.amount ||
      !tx.data.data.confirmations
    ) {
      throw new BadRequestException(`Tx ${hydTxId} is an invalid transaction`);
    }

    if (tx.data.data.recipient !== this.lockHydAddress) {
      throw new BadRequestException(
        "The transaction wasn't sent to the Hydra address we provided",
      );
    }

    if (tx.data.data.vendorField !== hashAddress(swapTargetEthAddress)) {
      throw new UnauthorizedException(
        'Invalid smartbridge in the provided transaction',
      );
    }
  }
}
