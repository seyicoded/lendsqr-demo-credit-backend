import type { Request, Response } from "express";
import { WebhookService } from "../services/webhook.service";

export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  verifyPaystackTransaction = async (req: Request, res: Response) => {
    try {
      const result = await this.webhookService.verifyPaystackTransaction(req);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
