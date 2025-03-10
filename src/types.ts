import * as EthCrypto from 'eth-crypto';
import { IsNotEmpty } from 'class-validator';
import { IsEthAddress } from './validation';

export class GetHydTxParamsForMintRequest {
  @IsNotEmpty()
  @IsEthAddress()
  swapTargetEthAddress: string;
}

export class HydTxParamsForMint {
  @IsNotEmpty()
  lockHydAddress: string;

  @IsNotEmpty()
  smartbridgeMessage: string;
}

export class GetMintParamsRequest {
  @IsNotEmpty()
  hydTxId: string;

  @IsNotEmpty()
  @IsEthAddress()
  swapTargetEthAddress: string;
}

export class ContractCallParamsForMint {
  @IsNotEmpty()
  amountHex: string;

  @IsNotEmpty()
  signature: EthCrypto.Signature;

  @IsNotEmpty()
  hydraTxHash: string;

  @IsNotEmpty()
  messageHash: string;
}

export class BurnContractCallParamsRequest {
  @IsNotEmpty()
  swapTargetHydAddress: string;

  @IsNotEmpty()
  amountHex: string;
}

export class ContractCallParamsForBurn {
  @IsNotEmpty()
  hydAddressHash: string;

  @IsNotEmpty()
  secret: string;

  @IsNotEmpty()
  amountHex: string;

  @IsNotEmpty()
  signature: EthCrypto.Signature;

  @IsNotEmpty()
  messageHash: string;
}

export class ExchangeBurntWHydToHydRequest {
  @IsNotEmpty()
  ethTxId: string;

  @IsNotEmpty()
  swapTargetHydAddress: string;
}

export class AppInfo {
  @IsNotEmpty()
  @IsEthAddress()
  contractAddress: string;
}
