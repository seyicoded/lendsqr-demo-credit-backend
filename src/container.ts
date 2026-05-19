import { db } from "../db/knex";
import { UserController } from "./controllers/user.controller";
import { WalletController } from "./controllers/wallet.controller";
import { AuditLogRepository } from "./repositories/audit-log.repository";
import { UserRepository } from "./repositories/user.repository";
import { WalletRepository } from "./repositories/wallet.repository";
import { AuthService } from "./services/auth.service";
import { UserService } from "./services/user.service";
import { WalletService } from "./services/wallet.service";
import { createAppGuard } from "./middleware/guard.middleware";
import { WalletTransactionRepository } from "./repositories/wallet-transaction.repository";

export const buildContainer = () => {
  const userRepository = new UserRepository(db);
  const auditLogRepository = new AuditLogRepository(db);
  const walletRepository = new WalletRepository(db);
  const walletTransactionRepository = new WalletTransactionRepository(db);
  const authService = new AuthService();

  const userService = new UserService(
    authService,
    userRepository,
    auditLogRepository,
    walletRepository,
    db,
  );
  const userController = new UserController(userService);

  const walletService = new WalletService(
    userRepository,
    auditLogRepository,
    walletRepository,
    walletTransactionRepository,
    db,
  );

  const walletController = new WalletController(walletService);
  const appGuard = createAppGuard(userRepository);

  return {
    userController,
    walletController,
    appGuard,
  };
};
