import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { WalletController } from "../../controllers/wallet.controller";

export const createWalletRouter = (
  walletController: WalletController,
): Router => {
  const router = Router();

  router.get("/overview", asyncHandler(walletController.overview));
  router.get("/transfer/bank-list", asyncHandler(walletController.bankList));

  router.post("/funds/cards", asyncHandler(walletController.fundWalletViaCard));

  router.post(
    "/transfer/internal",
    asyncHandler(walletController.transferToInternalWallet),
  );

  router.post(
    "/transfer/external",
    asyncHandler(walletController.transferToExternalWallet),
  );

  return router;
};
