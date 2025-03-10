import { HttpModule } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as EthCrypto from 'eth-crypto';
import Web3 from 'web3';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { DatabaseService } from './db.service';
import { EthService } from './eth.service';
import { HydraService } from './hydra.service';
import { IOService } from './io.service';
import { AppStateService } from './state.service';
import {
  BurnContractCallParamsRequest,
  ExchangeBurntWHydToHydRequest,
  GetMintParamsRequest,
  GetHydTxParamsForMintRequest,
} from './types';

describe('AppController', () => {
  let appController: AppController;
  let hydraService: HydraService;
  let ethService: EthService;
  let configService: ConfigService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      controllers: [AppController],
      providers: [
        AppService,
        IOService,
        HydraService,
        EthService,
        DatabaseService,
        AppStateService,
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    hydraService = app.get<HydraService>(HydraService);
    ethService = app.get<EthService>(EthService);
    configService = app.get<ConfigService>(ConfigService);
    dbService = app.get<DatabaseService>(DatabaseService);
  });

  describe('HYD -> WHYD', () => {
    it('getHydTxParamsForMint', () => {
      const params = new GetHydTxParamsForMintRequest();
      params.swapTargetEthAddress =
        '0x7B9951A1a806407E96215233D40a6B879524D3e6';
      const resp = appController.getHydTxParamsForMint(params);
      expect(resp.lockHydAddress).toStrictEqual(
        'ts5myE3i4ddKowGwPMaN2MPmeEHxrPiyuj',
      );
      expect(resp.smartbridgeMessage).toStrictEqual(
        '0960c74d7b96d22a70a164d66e94032fcf45646267e9d353285ce44dfb829c39',
      );
    });

    it('getMintParams', async () => {
      const params = new GetMintParamsRequest();
      params.hydTxId = '0xHYD_TX_ID';
      params.swapTargetEthAddress =
        '0x7B9951A1a806407E96215233D40a6B879524D3e6';

      jest
        .spyOn(hydraService, 'validateHydTxAndGetAmount')
        .mockImplementation(async () => BigInt(100));

      const resp = await appController.getMintParams(params);
      expect(resp).not.toBeNull();
      expect(resp.hydraTxHash).not.toBeNull();

      const expectedMessageHash = Web3.utils.soliditySha3(
        { type: 'address', value: params.swapTargetEthAddress },
        { type: 'bytes32', value: resp.hydraTxHash },
        { type: 'uint256', value: '0x64' },
      );

      const expectedSignature = EthCrypto.vrs.fromString(
        EthCrypto.sign(configService.contractOwnerPrivKey, expectedMessageHash),
      );
      expect(resp.messageHash).toStrictEqual(expectedMessageHash);
      expect(resp.signature).toStrictEqual(expectedSignature);
      expect(resp.amountHex).toStrictEqual('0x64');
    });
  });

  describe('WHYD -> HYD', () => {
    it('getContractCallParamsForBurn', async () => {
      const params = new BurnContractCallParamsRequest();
      params.swapTargetHydAddress = 'ts5myE3i4ddKowGwPMaN2MPmeEHxrPiyuj';
      params.amountHex = '0xa';

      const resp = appController.getContractCallParamsForBurn(params);
      const hashedAddress = Web3.utils.soliditySha3({
        type: 'string',
        value: params.swapTargetHydAddress,
      });
      const expectedHash = Web3.utils.soliditySha3(
        { type: 'bytes32', value: hashedAddress },
        { type: 'bytes32', value: resp.secret },
        { type: 'uint256', value: params.amountHex },
      );
      const privKey = configService.contractOwnerPrivKey;

      expect(resp.messageHash).toStrictEqual(expectedHash);
      expect(resp.signature).toStrictEqual(
        EthCrypto.vrs.fromString(EthCrypto.sign(privKey, expectedHash)),
      );
    });

    it('exchangeBurntWHydToHyd', async () => {
      const params = new ExchangeBurntWHydToHydRequest();
      params.ethTxId =
        '0x25b121d8150b8f83833d5fb21c9ec3fcbcd7e6a6de00bfcd3a557ec1e3d3bec8';
      params.swapTargetHydAddress = 'tjseecxRmob5qBS2T3qc8frXDKz3YUGB8J';

      jest
        .spyOn(ethService, 'validateEthBurnTxAndGetAmount')
        .mockImplementation(async () => BigInt(100));
      jest.spyOn(hydraService, 'sendHyd').mockImplementation(async () => 'tx');
      jest.spyOn(dbService, 'init').mockImplementation(() => {});
      jest.spyOn(dbService, 'storeSwap').mockImplementation(() => {});
      jest
        .spyOn(dbService, 'isTxAlreadySwapped')
        .mockImplementation(() => false);

      const resp = await appController.exchangeBurntWHydToHyd(params);
      expect(resp).toStrictEqual('tx');
    });
  });
});
