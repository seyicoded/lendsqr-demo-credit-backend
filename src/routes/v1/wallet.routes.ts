import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { WalletController } from "../../controllers/wallet.controller";

export const createWalletRouter = (
  walletController: WalletController,
): Router => {
  const router = Router();

  router.get("/overview", asyncHandler(walletController.overview));
  router.post("/funds/cards", asyncHandler(walletController.fundWalletViaCard));

  return router;
};
