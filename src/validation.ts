import { HttpException, ValidationPipeOptions } from '@nestjs/common';
import { registerDecorator, ValidationArguments } from 'class-validator';
import Web3 from 'web3';

export function IsEthAddress(validationOptions?: ValidationPipeOptions) {
  return (object: unknown, propertyName: string) => {
    registerDecorator({
      name: 'isEthAddress',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (Web3.utils.isAddress(value)) {
            return true;
          }

          throw new HttpException(
            {
              statusCode: 422,
              error: 'Unprocessable Entity',
              message: `Invalid Eth address ${value}`,
            },
            422,
          );
        },
      },
    });
  };
}
