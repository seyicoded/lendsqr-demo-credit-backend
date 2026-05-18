export interface Wallet {
  id: number;
  userId: number;
  availableBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletData {
  userId: number;
  availableBalance: number;
}

export interface WalletRecord {
  id: number;
  user_id: number;
  available_balance: number;
  created_at: Date;
  updated_at: Date;
}

export const toWallet = (record: WalletRecord): Wallet => ({
  id: record.id,
  userId: record.user_id,
  availableBalance: record.available_balance,
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
});
