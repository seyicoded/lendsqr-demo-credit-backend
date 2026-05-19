import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { WalletController } from "../../controllers/wallet.controller";
import { WebhookController } from "../../controllers/webhook.controller";

export const createWebhookRouter = (
  webhookController: WebhookController,
): Router => {
  const router = Router();

  // guest
  router.post(
    "/paystack-webhook",
    asyncHandler(webhookController.verifyPaystackTransaction),
  );

  return router;
};
