import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './db.service';
import {
  BurnContractCallParamsRequest,
  GetHydTxParamsForMintRequest,
  GetMintParamsRequest,
  ExchangeBurntWHydToHydRequest,
  HydTxParamsForMint,
  ContractCallParamsForMint,
  ContractCallParamsForBurn,
  AppInfo,
} from './types';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dbService: DatabaseService,
  ) {
    this.dbService.init();
  }

  @Get('/hyd-whyd/:swapTargetEthAddress/hyd-tx-params')
  @HttpCode(200)
  getHydTxParamsForMint(
    @Param() param: GetHydTxParamsForMintRequest,
  ): HydTxParamsForMint {
    return this.appService.getHydTxParamsForMint(param.swapTargetEthAddress);
  }

  @Get('/hyd-whyd/:swapTargetEthAddress/mint-params/:hydTxId')
  @HttpCode(200)
  async getMintParams(
    @Param() param: GetMintParamsRequest,
  ): Promise<ContractCallParamsForMint> {
    return await this.appService.getContractCallParamsForMint(
      param.hydTxId,
      param.swapTargetEthAddress,
    );
  }

  @Get('/whyd-hyd/:swapTargetHydAddress/burn-params/:amountHex')
  @HttpCode(200)
  getContractCallParamsForBurn(
    @Param() param: BurnContractCallParamsRequest,
  ): ContractCallParamsForBurn {
    return this.appService.getContractCallParamsForBurn(
      param.swapTargetHydAddress,
      param.amountHex,
    );
  }

  @Post('/whyd-hyd/exchange')
  @HttpCode(200)
  async exchangeBurntWHydToHyd(
    @Body() param: ExchangeBurntWHydToHydRequest,
  ): Promise<string> {
    return await this.appService.exchangeBurntWHydToHyd(
      param.ethTxId,
      param.swapTargetHydAddress,
    );
  }

  @Get('/info')
  @HttpCode(200)
  getAppInfo(): AppInfo {
    return this.appService.getAppInfo();
  }
}
