import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as EthCrypto from 'eth-crypto';
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core';
import { ConfigService } from './config/config.service';
import { IOService } from './io.service';

const web3 = new Web3();
@Injectable()
export class EthService {
  private readonly contractAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly ioService: IOService,
  ) {
    this.contractAddress = this.configService.contractAddress;
  }

  async validateEthBurnTxAndGetAmount(
    ethTxId: string,
    swapTargetHydAddress: string,
  ): Promise<BigInt> {
    const tx = await this.ioService.getEthTx(ethTxId);
    if (!tx) {
      throw new NotFoundException(`Transaction not found: ${ethTxId}`);
    }

    const receipt = await this.ioService.getEthTxReceipt(ethTxId);
    if (!receipt.status) {
      throw new BadRequestException(
        'Transaction was reverted by EVM, cannot be claimed.',
      );
    }

    const confirms = await this.getConfirmationCount(receipt);
    const expectedConfirmations = this.configService.waitForConfirmations
      ? 20
      : 1;
    if (confirms < expectedConfirmations) {
      throw new BadRequestException(
        `Tx must be well confirmed (20 or more). Current confirmations: ${confirms}`,
      );
    }

    // READ THIS, if you want to understand the below code
    // Source: https://medium.com/@codetractio/inside-an-ethereum-transaction-fa94ffca912f

    // the first 32 bit is the contract fn's name. We're substring 0->10 because of the leadin 0x
    const calledFn = tx.input.substring(0, 10);
    const expectedFnCall = EthCrypto.hash
      .keccak256(
        'burnWrappedHydra(bytes32,bytes32,uint256,uint8,bytes32,bytes32)',
      )
      .substring(0, 10);

    if (calledFn !== expectedFnCall) {
      throw new BadRequestException(
        'The transaction was not a burnWrappedHydra call.',
      );
    }

    const calledContract = tx.to.toLowerCase();

    if (calledContract !== this.contractAddress) {
      throw new BadRequestException(
        `The transaction was not called on our WrappedHydra contract (${this.contractAddress}), but: ${calledContract}`,
      );
    }

    try {
      const inputs = web3.eth.abi.decodeParameters(
        ['bytes32', 'bytes32', 'uint256'],
        tx.input.substr(10),
      );
      const expectedHydAddressHash = EthCrypto.hash.keccak256(
        swapTargetHydAddress,
      );
      const hydAddressHash = inputs[0];
      const amount = inputs[2];
      if (hydAddressHash !== expectedHydAddressHash) {
        throw new UnauthorizedException(
          `Invalid hash in the contract call: ${hydAddressHash}`,
        );
      }
      return BigInt(amount);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  private async getConfirmationCount(
    receipt: TransactionReceipt,
  ): Promise<number> {
    const currentBlockHeight = await this.ioService.getEthBlockHeight();

    try {
      if (receipt && receipt.blockNumber && currentBlockHeight) {
        return currentBlockHeight - receipt.blockNumber;
      }

      return 0;
    } catch (e) {
      return 0;
    }
  }
}
