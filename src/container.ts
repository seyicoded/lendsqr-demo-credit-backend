import { db } from "../db/knex";
import { UserController } from "./controllers/user.controller";
import { AuditLogRepository } from "./repositories/audit-log.repository";
import { UserRepository } from "./repositories/user.repository";
import { AuthService } from "./services/auth.service";
import { UserService } from "./services/user.service";

export const buildContainer = () => {
  const userRepository = new UserRepository(db);
  const auditLogRepository = new AuditLogRepository(db);
  const userService = new UserService(userRepository, auditLogRepository, db);
  const authService = new AuthService();
  const userController = new UserController(userService, authService);

  return {
    userController,
  };
};
