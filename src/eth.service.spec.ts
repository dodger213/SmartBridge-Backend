import { mock, instance, when } from 'ts-mockito';
import Web3 from 'web3';
import { Transaction, TransactionReceipt } from 'web3-core';
import * as EthCrypto from 'eth-crypto';
import { ConfigService } from './config/config.service';
import { EthService } from './eth.service';
import { IOService } from './io.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('EthService', () => {
  const configService = new ConfigService();
  const MockIOService = mock(IOService);
  const ioService = instance(MockIOService);
  const ethService = new EthService(configService, ioService);

  const constructInput = (
    methodDescriptor: string,
    targetHydAddress: string,
    secret: string,
    amount: number,
    v: string,
    r: string,
    s: string,
  ): string => {
    const burnFn = Web3.utils.sha3(methodDescriptor).substring(0, 10);
    const targetHex = Web3.utils.padLeft(
      Web3.utils.stripHexPrefix(EthCrypto.hash.keccak256(targetHydAddress)),
      64,
    );
    const secretHex = Web3.utils.padLeft(
      Web3.utils.stripHexPrefix(Web3.utils.stringToHex(secret)),
      64,
    );
    const amountHex = Web3.utils.padLeft(
      Web3.utils.stripHexPrefix(Web3.utils.numberToHex(amount)),
      64,
    );
    const vHex = Web3.utils.padLeft(
      Web3.utils.stripHexPrefix(Web3.utils.stringToHex(v)),
      64,
    );
    const rHex = Web3.utils.padLeft(
      Web3.utils.stripHexPrefix(Web3.utils.stringToHex(r)),
      64,
    );
    const sHex = Web3.utils.padLeft(
      Web3.utils.stripHexPrefix(Web3.utils.stringToHex(s)),
      64,
    );
    return `${burnFn}${targetHex}${secretHex}${amountHex}${vHex}${rHex}${sHex}`;
  };

  const constructValidTx = (
    input: string,
    contract = '0x9bdacc79ac4a6b4209b4d6222f85ea67156077d5',
  ): Transaction => {
    return {
      hash: 'tx',
      nonce: 1,
      blockHash: 'blockhash',
      blockNumber: 1,
      transactionIndex: null,
      from: 'from',
      to: contract,
      value: '0',
      gasPrice: '1',
      gas: 1,
      input,
    };
  };

  const constructValidReceipt = (): TransactionReceipt => {
    return {
      status: true,
      transactionIndex: 1,
      transactionHash: 'tx',
      blockHash: 'blockhash',
      blockNumber: 1,
      from: 'from',
      to: '0x468459E128a553462F1c5b13F4f67f657B81eA4e',
      cumulativeGasUsed: 1,
      gasUsed: 1,
      logs: [],
      logsBloom: '',
    };
  };

  describe('validateEthBurnTxAndGetAmount', () => {
    it('Returns the correct amount if everything is all right', async () => {
      const input = constructInput(
        'burnWrappedHydra(bytes32,bytes32,uint256,uint8,bytes32,bytes32)',
        'hyd_addr',
        'secret',
        100,
        'r',
        's',
        'v',
      );
      when(MockIOService.getEthBlockHeight()).thenResolve(42);
      when(MockIOService.getEthTx('tx')).thenResolve(constructValidTx(input));
      when(MockIOService.getEthTxReceipt('tx')).thenResolve(
        constructValidReceipt(),
      );

      const amount = await ethService.validateEthBurnTxAndGetAmount(
        'tx',
        'hyd_addr',
      );
      expect(amount).toStrictEqual(BigInt(100));
    });
  });

  it('Throws if there is no such ETH transaction', async () => {
    when(MockIOService.getEthTx('tx')).thenReject(
      new InternalServerErrorException(),
    );
    await expect(
      ethService.validateEthBurnTxAndGetAmount('tx', 'hyd_addr'),
    ).rejects.toThrowError(InternalServerErrorException);
  });

  it('Throws if invalid receipt', async () => {
    const input = constructInput(
      'burnWrappedHydra(bytes32,bytes32,uint256,uint8,bytes32,bytes32)',
      'hyd_addr',
      'secret',
      100,
      'r',
      's',
      'v',
    );
    when(MockIOService.getEthTx('tx')).thenResolve(constructValidTx(input));
    when(MockIOService.getEthTxReceipt('tx')).thenReject(
      new InternalServerErrorException(),
    );
    await expect(
      ethService.validateEthBurnTxAndGetAmount('tx', 'hyd_addr'),
    ).rejects.toThrowError(InternalServerErrorException);
  });

  it('Throws if it was a wrong function call', async () => {
    const input = constructInput(
      'burnWrappedHydra(uint256)',
      'hyd_addr',
      'secret',
      100,
      'r',
      's',
      'v',
    );
    when(MockIOService.getEthBlockHeight()).thenResolve(42);
    when(MockIOService.getEthTx('tx')).thenResolve(constructValidTx(input));
    when(MockIOService.getEthTxReceipt('tx')).thenResolve(
      constructValidReceipt(),
    );
    await expect(
      ethService.validateEthBurnTxAndGetAmount('tx', 'hyd_addr'),
    ).rejects.toThrowError(BadRequestException);
  });

  it("Throws if it wasn't called on our contract", async () => {
    const input = constructInput(
      'burnWrappedHydra(bytes32,bytes32,uint256,uint8,bytes32,bytes32)',
      'hyd_addr',
      'secret',
      100,
      'r',
      's',
      'v',
    );
    when(MockIOService.getEthBlockHeight()).thenResolve(42);
    when(MockIOService.getEthTx('tx')).thenResolve(
      constructValidTx(input, '0x9bdacc79ac4a6b4209b4d6222f85ea67156077d4'),
    );
    when(MockIOService.getEthTxReceipt('tx')).thenResolve(
      constructValidReceipt(),
    );
    await expect(
      ethService.validateEthBurnTxAndGetAmount('tx', 'hyd_addr'),
    ).rejects.toThrowError(BadRequestException);
  });

  it('Throws if the contract call input contains invalid data', async () => {
    const burnFn = Web3.utils
      .sha3('burnWrappedHydra(uint256,bytes32,bytes)')
      .substring(0, 10);

    const input = `${burnFn}`;

    when(MockIOService.getEthBlockHeight()).thenResolve(42);
    when(MockIOService.getEthTx('tx')).thenResolve(constructValidTx(input));
    when(MockIOService.getEthTxReceipt('tx')).thenResolve(
      constructValidReceipt(),
    );
    await expect(
      ethService.validateEthBurnTxAndGetAmount('tx', 'hyd_addr'),
    ).rejects.toThrowError(BadRequestException);
  });

  it('Throws if the tx has not enough confirmations', async () => {
    const input = constructInput(
      'burnWrappedHydra(bytes32,bytes32,uint256,uint8,bytes32,bytes32)',
      'hyd_addr',
      'secret',
      100,
      'r',
      's',
      'v',
    );
    when(MockIOService.getEthBlockHeight()).thenResolve(2);
    when(MockIOService.getEthTx('tx')).thenResolve(constructValidTx(input));
    when(MockIOService.getEthTxReceipt('tx')).thenResolve(
      constructValidReceipt(),
    );
    await expect(
      ethService.validateEthBurnTxAndGetAmount('tx', 'hyd_addr'),
    ).rejects.toThrowError(BadRequestException);
  });
});
