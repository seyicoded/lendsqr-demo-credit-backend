interface INFO {
  type?: "external" | "internal";
  user_id?: number | null;
  bank?: string | null;
  account_number?: string | null;
  account_name?: string | null;
}

export interface WalletTransaction {
  id: number;
  userId: number;
  walletId: number;
  amount: number;
  status: "failed" | "processing" | "completed" | "reversed";
  reason: string | null;
  reference: string | null;
  type: "deposit" | "withdrawal";
  via: "wallet" | "direct_bank" | "card";
  senderInfo: INFO | null;
  receiverInfo: INFO | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionRecord {
  id: number;
  user_id: number;
  wallet_id: number;
  amount: number;
  status: "failed" | "processing" | "completed" | "reversed";
  reason: string | null;
  reference: string | null;
  type: "deposit" | "withdrawal";
  via: "wallet" | "direct_bank" | "card";
  sender_info: INFO | null;
  receiver_info: INFO | null;
  created_at: Date;
  updated_at: Date;
}

export const toWalletTransaction = (
  record: WalletTransactionRecord,
): WalletTransaction => ({
  id: record.id,
  userId: record.user_id,
  walletId: record.wallet_id,
  amount: record.amount,
  status: record.status,
  reason: record.reason,
  reference: record.reference,
  type: record.type,
  via: record.via,
  senderInfo: record.sender_info,
  receiverInfo: record.receiver_info,
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
});
