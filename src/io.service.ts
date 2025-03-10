import {
  HttpService,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Crypto, Layer1, NetworkConfig, Types } from '@internet-of-people/sdk';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Transaction, TransactionReceipt } from 'web3-core';
import WrappedHydra from './WrappedHydra.json';
import { ConfigService } from './config/config.service';

@Injectable()
export class IOService {
  private readonly hydraExplorerHost: string;
  private readonly hydraExplorerPort: number;
  private readonly lockHydVaultPassword: string;
  private readonly web3: Web3;
  private readonly contractAddress: string;
  private readonly contract: any;
  private readonly lockHydAddress: string;
  private layer1Api: Types.Layer1.IApi;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.hydraExplorerHost = this.configService.hydExplorerHost;
    this.hydraExplorerPort = this.configService.hydExplorerPort;
    this.lockHydVaultPassword = this.configService.lockHydUnlockPassword;
    this.contractAddress = this.configService.contractAddress;
    this.lockHydAddress = this.configService.lockHydAddress;

    const ethereumNetwork = configService.ethereumNetwork;
    const infuraKey = configService.infuraKey;
    const provider = new Web3.providers.HttpProvider(
      `https://${ethereumNetwork}.infura.io/v3/${infuraKey}`,
    );
    this.web3 = new Web3(provider);
    this.contract = new this.web3.eth.Contract(
      WrappedHydra.abi as AbiItem[],
      this.contractAddress,
    );
  }

  async getHydraTx(txId: string): Promise<any> {
    try {
      return await this.httpService
        .get(
          `${this.hydraExplorerHost}:${this.hydraExplorerPort}/api/v2/transactions/${txId}`,
          {
            validateStatus: (_) => true,
          },
        )
        .toPromise();
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async sendHydraTransferTx(
    from: string,
    to: string,
    amountFlake: BigInt,
    hydraAccount: Crypto.HydraPlugin,
  ): Promise<string> {
    try {
      const api = await this.getLayer1Api();
      return await api.sendTransferTx(
        from,
        to,
        amountFlake,
        hydraAccount.priv(this.lockHydVaultPassword),
      );
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async getWHYDContractBalance(): Promise<BigInt> {
    try {
      const contractMethod = await this.contract.methods.totalSupply();
      const amountFlakes = await contractMethod.call();
      return BigInt(amountFlakes);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async getLockHydAddressBalance(): Promise<BigInt> {
    const api = await this.getLayer1Api();
    return await api.getWalletBalance(this.lockHydAddress);
  }

  async getEthTx(txId: string): Promise<Transaction> {
    try {
      return await this.web3.eth.getTransaction(txId);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async getEthTxReceipt(txId: string): Promise<TransactionReceipt> {
    try {
      return await this.web3.eth.getTransactionReceipt(txId);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async getEthBlockHeight(): Promise<number> {
    try {
      return await this.web3.eth.getBlockNumber();
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  private async getLayer1Api(): Promise<Types.Layer1.IApi> {
    if (!this.layer1Api) {
      this.layer1Api = await Layer1.createApi(
        NetworkConfig.fromUrl(this.hydraExplorerHost, this.hydraExplorerPort),
      );
    }

    return this.layer1Api;
  }
}
