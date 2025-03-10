import { anything, instance, mock, reset, verify, when } from 'ts-mockito';
import * as EthCrypto from 'eth-crypto';
import Web3 from 'web3';
import { AppService } from './app.service';
import { ConfigService } from './config/config.service';
import { DatabaseService } from './db.service';
import { EthService } from './eth.service';
import { HydraService } from './hydra.service';
import { hashAddress } from './utils';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppStateService } from './state.service';

describe('AppService', () => {
  const MockHydraService = mock(HydraService);
  const hydraService = instance(MockHydraService);
  const MockEthService = mock(EthService);
  const ethService = instance(MockEthService);
  const dbService = new DatabaseService();
  const MockAppStateService = mock(AppStateService);
  const appStateService = instance(MockAppStateService);

  const configService = new ConfigService();
  const appService = new AppService(
    configService,
    hydraService,
    ethService,
    dbService,
    appStateService,
  );

  beforeAll(() => {
    dbService.init();
  });

  beforeEach(() => {
    dbService.clear();
    when(MockAppStateService.isApiEnabled()).thenReturn(true);
  });

  it('Service can be disabled', async () => {
    when(
      MockHydraService.validateHydTxAndGetAmount(anything(), anything()),
    ).thenResolve(BigInt(100));

    when(MockAppStateService.isApiEnabled()).thenReturn(false);

    await expect(
      appService.getContractCallParamsForMint(
        '0xHYD_TX_ID',
        '0x7B9951A1a806407E96215233D40a6B879524D3e6',
      ),
    ).rejects.toThrowError(ForbiddenException);
  });

  it('getHydTxParamsForMint', () => {
    const resp = appService.getHydTxParamsForMint('swap_eth_address');
    expect(resp.lockHydAddress).toStrictEqual(
      'ts5myE3i4ddKowGwPMaN2MPmeEHxrPiyuj',
    );
    expect(resp.smartbridgeMessage).toStrictEqual(
      hashAddress('swap_eth_address'),
    );
  });

  describe('getContractCallParamsForMint', () => {
    it('Returns all information', async () => {
      when(
        MockHydraService.validateHydTxAndGetAmount(anything(), anything()),
      ).thenResolve(BigInt(100));
      const resp = await appService.getContractCallParamsForMint(
        '0xHYD_TX_ID',
        '0x7B9951A1a806407E96215233D40a6B879524D3e6',
      );

      expect(resp.hydraTxHash).not.toBeNull();
      expect(resp.amountHex).toStrictEqual('0x64');
      expect(resp.signature.v).not.toBeNull();
      expect(resp.signature.r).not.toBeNull();
      expect(resp.signature.s).not.toBeNull();
      expect(resp.messageHash).not.toBeNull();

      const expectedMessageHash = Web3.utils.soliditySha3(
        {
          type: 'address',
          value: '0x7B9951A1a806407E96215233D40a6B879524D3e6',
        },
        { type: 'bytes32', value: resp.hydraTxHash },
        { type: 'uint256', value: '0x64' },
      );

      expect(expectedMessageHash).toStrictEqual(resp.messageHash);

      expect(
        EthCrypto.recover(
          EthCrypto.vrs.toString(resp.signature),
          resp.messageHash,
        ),
      ).toStrictEqual('0x8A323cf02B18A59e209C66817A057a1000e0B712');
    });

    it('getContractCallParamsForBurn', () => {
      const resp = appService.getContractCallParamsForBurn('hyd_addr', '0x2');
      expect(resp.secret).not.toBeNull();
      expect(resp.amountHex).toStrictEqual('0x2');
      expect(resp.signature.v).not.toBeNull();
      expect(resp.signature.r).not.toBeNull();
      expect(resp.signature.s).not.toBeNull();
      const hydAddressHash = EthCrypto.hash.keccak256('hyd_addr');
      expect(resp.hydAddressHash).toStrictEqual(hydAddressHash);

      expect(resp.messageHash).not.toBeNull();

      const expectedMessageHash = Web3.utils.soliditySha3(
        { type: 'bytes32', value: hydAddressHash },
        { type: 'bytes32', value: resp.secret },
        { type: 'uint256', value: '0x2' },
      );
      expect(resp.messageHash).toStrictEqual(expectedMessageHash);
      expect(
        EthCrypto.recover(
          EthCrypto.vrs.toString(resp.signature),
          resp.messageHash,
        ),
      ).toStrictEqual('0x8A323cf02B18A59e209C66817A057a1000e0B712');
    });
  });

  describe('exchangeBurntWHydToHyd', () => {
    it('Sends HYD if everything is valid', async () => {
      when(
        MockEthService.validateEthBurnTxAndGetAmount(anything(), anything()),
      ).thenResolve(BigInt(100));
      when(MockHydraService.sendHyd(anything(), anything())).thenResolve(
        'txId',
      );

      const resp = await appService.exchangeBurntWHydToHyd(
        'eth_tx',
        'target_hyd_addr',
      );
      verify(MockHydraService.sendHyd('target_hyd_addr', BigInt(100))).called();
      expect(resp).toStrictEqual('txId');
    });

    it('Cannot swap the same tx twice', async () => {
      reset(MockHydraService);
      when(
        MockEthService.validateEthBurnTxAndGetAmount(anything(), anything()),
      ).thenResolve(BigInt(100));
      when(MockHydraService.sendHyd(anything(), anything())).thenResolve(
        'txId',
      );

      await expect(
        appService.exchangeBurntWHydToHyd('eth_tx', 'target_hyd_addr'),
      ).resolves.not.toThrow();
      await expect(
        appService.exchangeBurntWHydToHyd('eth_tx', 'target_hyd_addr'),
      ).rejects.toThrowError(BadRequestException);
      verify(MockHydraService.sendHyd('target_hyd_addr', BigInt(100))).once();
    });
  });
});
