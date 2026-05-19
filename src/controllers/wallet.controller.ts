import type { Request, Response } from "express";
import { WalletService } from "../services/wallet.service";
import {
  fundWalletSchema,
  transferToExternalWalletSchema,
  transferToInternalWalletSchema,
} from "../validators/wallet.validator";
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

  transferToInternalWallet = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const payload = transferToInternalWalletSchema.parse(req.body);
    const response = await this.walletService.transferToInternalWallet(
      payload,
      req.user,
    );

    res
      .status(StatusCodes.OK)
      .json(successResponse("transfer successful", response));
  };

  transferToExternalWallet = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const payload = transferToExternalWalletSchema.parse(req.body);
    const response = await this.walletService.transferToExternalWallet(
      payload,
      req.user,
    );

    res
      .status(StatusCodes.OK)
      .json(successResponse("transfer successful", response));
  };

  bankList = async (req: Request, res: Response): Promise<void> => {
    const response = await this.walletService.bankList();

    res
      .status(StatusCodes.OK)
      .json(successResponse("bank list fetched successfully", response));
  };
}
