import { Injectable } from '@nestjs/common';
import Database = require('better-sqlite3');

@Injectable()
export class DatabaseService {
  private readonly db: Database;
  private readonly test: boolean;

  constructor() {
    this.test = process.env.NODE_ENV && process.env.NODE_ENV === 'test';
    this.db = new Database(
      this.test ? 'data/database.test.sqlite' : 'data/database.sqlite',
      {},
    );
  }

  init(): void {
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS swapped_txs (
        tx_id                TEXT    PRIMARY KEY,
        target_address       TEXT    NOT NULL,
        amount               TEXT    NOT NULL,
        timestamp            INTEGER NOT NULL
      )`,
      )
      .run();
  }

  clear(): void {
    if (!this.test) {
      console.log('!!! DO NOT CLEAR IN PRODUCTION');
      return;
    }

    this.db.prepare('DELETE FROM swapped_txs').run();
  }

  storeSwap(txId: string, targetAddress: string, amount: BigInt): void {
    this.db
      .prepare(
        `
      INSERT INTO swapped_txs VALUES (
        @tx_id,
        @target_address,
        @amount,
        DATETIME('now')
      )
    `,
      )
      .run({
        tx_id: txId,
        target_address: targetAddress,
        amount: amount.toString(),
      });
  }

  isTxAlreadySwapped(txId: string): boolean {
    const res = this.db
      .prepare(`SELECT count(1) as cnt FROM swapped_txs WHERE tx_id = @tx_id`)
      .get({ tx_id: txId });

    return res.cnt > 0;
  }
}
