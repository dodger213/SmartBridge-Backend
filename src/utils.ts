import * as Crypto from 'crypto';

export const hashAddress = (address: string): string => {
  return Crypto.createHmac('sha256', '[Qz(Vw7e5(r-qM-')
    .update(
      Buffer.from(
        address.substr(0, 2).toLowerCase() === '0x'
          ? address.substr(2)
          : address,
        'hex',
      ),
    )
    .digest('hex');
};
