import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { mock, instance, when, anything } from 'ts-mockito';
import { ConfigService } from './config/config.service';
import { HydraService } from './hydra.service';
import { IOService } from './io.service';
import { hashAddress } from './utils';

describe('HydraService', () => {
  const configService = new ConfigService();
  const MockIOService = mock(IOService);
  const ioService = instance(MockIOService);
  const hydraService = new HydraService(ioService, configService);

  describe('validateHydTxAndGetAmount', () => {
    it('Throws if not 200', async () => {
      when(MockIOService.getHydraTx('tx')).thenResolve({ status: 404 });

      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(NotFoundException);
    });

    it('Throws if api rejects', async () => {
      when(MockIOService.getHydraTx('tx')).thenReject();
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(InternalServerErrorException);
    });

    it('Throws if the tx is not a valid transfer tx', async () => {
      when(MockIOService.getHydraTx('tx')).thenResolve({ status: 200 });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: {},
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: { data: {} },
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: { data: { amount: '100' } },
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: { data: { amount: '100', typeGroup: 2, type: 0 } },
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: { data: { amount: '100', typeGroup: 1, type: 2 } },
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: {
          data: { amount: '100', typeGroup: 1, type: 0, recipient: 'fake' },
        },
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: {
          data: {
            amount: '100',
            typeGroup: 1,
            type: 0,
            recipient: configService.lockHydAddress,
            confirmations: 54,
          },
        },
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(UnauthorizedException);

      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: {
          data: {
            amount: '100',
            typeGroup: 1,
            type: 0,
            recipient: configService.lockHydAddress,
            vendorField: 'invalid',
            confirmations: 54,
          },
        },
      });
      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(UnauthorizedException);
    });

    it('Returns the correct amount', async () => {
      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: {
          data: {
            amount: '100',
            typeGroup: 1,
            type: 0,
            recipient: configService.lockHydAddress,
            vendorField: hashAddress('address'),
            confirmations: 54,
          },
        },
      });
      const amount = await hydraService.validateHydTxAndGetAmount(
        'tx',
        'address',
      );
      expect(amount).toStrictEqual(BigInt(100));
    });

    it('Throws if the tx has not enough confirmations', async () => {
      when(MockIOService.getHydraTx('tx')).thenResolve({
        status: 200,
        data: {
          data: {
            amount: '100',
            typeGroup: 1,
            type: 0,
            recipient: configService.lockHydAddress,
            vendorField: hashAddress('address'),
            confirmations: 52,
          },
        },
      });

      await expect(
        hydraService.validateHydTxAndGetAmount('tx', 'address'),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('sendHyd', () => {
    it('Throws if transfer tx throws', async () => {
      when(
        MockIOService.sendHydraTransferTx(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenReject();
      await expect(hydraService.sendHyd('to', BigInt(1))).rejects.toThrowError(
        InternalServerErrorException,
      );
    });

    it('Does not throw if everything is all right', async () => {
      when(
        MockIOService.sendHydraTransferTx(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve('tx');
      const txId = await hydraService.sendHyd('to', BigInt(1));
      expect(txId).toStrictEqual('tx');
    });
  });
});
