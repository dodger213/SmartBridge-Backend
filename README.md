## HYD <-> WHYD Bridge Backend

## Requirements

- Node 14
- make

## Installation

```bash
$ npm ci
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Manual Testing Samples

### Mint

```bash
$ curl -X GET -H "Content-Type: application/json" http://localhost:3000/hyd-whyd/[your_eth_address]/hyd-tx-params

{
  "lockHydAddress": "tjseecxRmob5qBS2T3qc8frXDKz3YUGB8J",
  "smartbridgeMessage": "6a2165f3d0f51a4d58bf18d4b02251267ec378bd47821b054ed6dbd3d242dff0"
}
```

```bash
$ curl -X GET -H "Content-Type: application/json" http://localhost:3000/hyd-whyd/[your_eth_address]/mint-params/[the_hyd_tx]

{
  "secret": "0xbd8f7944aa585b2fa1a1886b22b1b11831ea0047a78d4d5a7d799610c401005a",
  "amountHex": "0x5f5e100",
  "signature": {
    "v": "0x1c",
    "r": "0xfa21078f46340bc720d571c394848729ef6d45f478fa6a0d7199b0b1790daaae",
    "s": "0x57df603766b9a6cef30e00f1b6c82b745aea419d9043bed84b344f3335655069"
  },
  "contractAddress": "0x9bdacc79ac4a6b4209b4d6222f85ea67156077d5",
  "messageHash": "0x88c72d8993ae3414221a9264a06037d6eeeac27d9f30ef7176cf15002b91c08e"
}
```

### Burn

```bash
$ curl -X GET -H "Content-Type: application/json" http://localhost:3000/whyd-hyd/[your_hyd_address]/burn-params/[hex_amount_flakes]

{
  "hydAddressHash": "0x4207ee1568b444007786474cf74e69a41c354a699ea2422539bd80e1a2a4412f",
  "secret": "c9e6518ad1780883733c05f3f3a05405b46009f43c8fd279d07cd68a34832d95",
  "amountHex": "0x100000000",
  "signature": {
    "v": "0x1b",
    "r": "0xf5c1b48040881a346273576642c26c811c22c3bb891e45e763d248c711e11965",
    "s": "0x5d40585a02c90dbc5e1705a3c25d7832216f8230d4c8dcf0ca06fb4f6a604758"
  },
  "contractAddress": "0x9bdacc79ac4a6b4209b4d6222f85ea67156077d5",
  "messageHash": "0xad19832f38d4d580732ede3f467a93dbc24d18aee142b6a88475fd2e84e5cfbd"
}
```

```bash
$ curl -X POST -H "Content-Type: application/json" -d '{"swapTargetHydAddress":"[your_hyd_address]", "ethTxId":"[eth_tx_id]"}' http://localhost:3000/whyd-hyd/exchange

a41d9bcc4772a4a7853d611d42de84d6a73c8b45af9020d79cd64ee181cd39cf
```