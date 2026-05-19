import type { Request, Response } from "express";
import { WalletService } from "../services/wallet.service";
import { fundWalletSchema } from "../validators/wallet.validator";
import { StatusCodes } from "http-status-codes";
import { successResponse } from "../utils/api-response";

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  overview = async (req: Request, res: Response): Promise<void> => {
    const walletOverview = await this.walletService.getWalletOverview(req.user);

    res
      .status(StatusCodes.OK)
      .json(
        successResponse(
          "Wallet overview retrieved successfully",
          walletOverview,
        ),
      );
  };

  fundWalletViaCard = async (req: Request, res: Response): Promise<void> => {
    const payload = fundWalletSchema.parse(req.body);
    const response = await this.walletService.fundWalletViaCard(
      payload,
      req.user,
    );

    res
      .status(StatusCodes.OK)
      .json(successResponse("link generated successfully", response));
  };
}
