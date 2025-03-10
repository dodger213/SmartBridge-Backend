import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as EthCrypto from 'eth-crypto';
import * as Crypto from 'crypto';
import Web3 from 'web3';
import {
  HydTxParamsForMint,
  ContractCallParamsForMint,
  ContractCallParamsForBurn,
  AppInfo,
} from './types';
import { HydraService } from './hydra.service';
import { hashAddress } from './utils';
import { EthService } from './eth.service';
import { ConfigService } from './config/config.service';
import { DatabaseService } from './db.service';
import { AppStateService } from './state.service';

@Injectable()
export class AppService {
  private readonly lockHydAddress: string;
  private readonly contractOwnerPrivKey: string;
  private readonly contractAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly hydraService: HydraService,
    private readonly ethService: EthService,
    private readonly dbservice: DatabaseService,
    private readonly appStateService: AppStateService,
  ) {
    this.lockHydAddress = this.configService.lockHydAddress;
    this.contractAddress = this.configService.contractAddress;
    this.contractOwnerPrivKey = this.configService.contractOwnerPrivKey;
  }

  getHydTxParamsForMint(swapTargetEthAddress: string): HydTxParamsForMint {
    this.ensureEnabled();

    return {
      lockHydAddress: this.lockHydAddress,
      smartbridgeMessage: hashAddress(swapTargetEthAddress.toLowerCase()),
    };
  }

  async getContractCallParamsForMint(
    hydTxId: string,
    swapTargetEthAddress: string,
  ): Promise<ContractCallParamsForMint> {
    this.ensureEnabled();

    swapTargetEthAddress = swapTargetEthAddress.toLowerCase();
    const amount = await this.hydraService.validateHydTxAndGetAmount(
      hydTxId,
      swapTargetEthAddress,
    );
    const amountHex = `0x${amount.toString(16)}`;
    const hydraTxHash = EthCrypto.hash.keccak256(hydTxId);

    const messageHash = Web3.utils.soliditySha3(
      { type: 'address', value: swapTargetEthAddress },
      { type: 'bytes32', value: hydraTxHash },
      { type: 'uint256', value: amountHex },
    );

    const vrs = EthCrypto.vrs.fromString(
      EthCrypto.sign(this.contractOwnerPrivKey, messageHash),
    );

    return {
      hydraTxHash,
      amountHex: amountHex,
      signature: vrs,
      messageHash: messageHash,
    };
  }

  getContractCallParamsForBurn(
    swapTargetHydAddress: string,
    amountHex: string,
  ): ContractCallParamsForBurn {
    this.ensureEnabled();

    const hydAddressHash = EthCrypto.hash.keccak256(swapTargetHydAddress);
    const secret = `0x${Crypto.randomBytes(32).toString('hex')}`;
    const messageHash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: hydAddressHash },
      { type: 'bytes32', value: secret },
      { type: 'uint256', value: amountHex },
    );

    const vrs = EthCrypto.vrs.fromString(
      EthCrypto.sign(this.contractOwnerPrivKey, messageHash),
    );

    return {
      hydAddressHash: hydAddressHash,
      secret,
      amountHex,
      signature: vrs,
      messageHash: messageHash,
    };
  }

  async exchangeBurntWHydToHyd(
    ethTxId: string,
    swapTargetHydAddress: string,
  ): Promise<string> {
    this.ensureEnabled();

    if (this.dbservice.isTxAlreadySwapped(ethTxId)) {
      throw new BadRequestException(
        `Transaction ${ethTxId} has already been used`,
      );
    }

    const amount: BigInt = await this.ethService.validateEthBurnTxAndGetAmount(
      ethTxId,
      swapTargetHydAddress,
    );
    this.dbservice.storeSwap(ethTxId, swapTargetHydAddress, amount);
    return await this.hydraService.sendHyd(swapTargetHydAddress, amount);
  }

  getAppInfo(): AppInfo {
    this.ensureEnabled();

    return {
      contractAddress: this.contractAddress,
    };
  }

  private ensureEnabled(): void {
    if (!this.appStateService.isApiEnabled()) {
      throw new ForbiddenException('The API is currently disabled');
    }
  }
}
