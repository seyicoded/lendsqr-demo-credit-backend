import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { AuthService } from "../../src/services/auth.service";

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../../src/config/env", () => ({
  env: {
    JWT_SECRET: "test-secret",
    JWT_EXPIRY: "1h",
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  // ─── validateNewUser ────────────────────────────────────────────────────────

  describe("validateNewUser", () => {
    const validPayload = {
      firstName: "Ada",
      lastName: "Lovelace",
      bvn: 12345678901,
      email: "ada@example.com",
      username: "ada_lovelace",
      password: "StrongPass123\!",
    };

    it("resolves without error for a valid user payload", async () => {
      await expect(
        authService.validateNewUser(validPayload),
      ).resolves.toBeUndefined();
    });

    it("throws when password is shorter than 8 characters", async () => {
      await expect(
        authService.validateNewUser({ ...validPayload, password: "short" }),
      ).rejects.toThrow("Password must be at least 8 characters long");
    });

    it("throws when email format is invalid", async () => {
      await expect(
        authService.validateNewUser({ ...validPayload, email: "not-an-email" }),
      ).rejects.toThrow("Invalid email format");
    });

    it("throws when email is blacklisted", async () => {
      await expect(
        authService.validateNewUser({
          ...validPayload,
          email: "blacklisteduser@gmail.com",
        }),
      ).rejects.toThrow("This email is blacklisted");
    });
  });

  // ─── hashPassword ───────────────────────────────────────────────────────────

  describe("hashPassword", () => {
    it("returns the hashed string from bcrypt", async () => {
      (mockBcrypt.hash as jest.Mock).mockResolvedValue("hashedValue");

      const result = await authService.hashPassword("plaintext");

      expect(result).toBe("hashedValue");
      expect(mockBcrypt.hash).toHaveBeenCalledWith("plaintext", 10);
    });
  });

  // ─── comparePasswords ───────────────────────────────────────────────────────

  describe("comparePasswords", () => {
    it("returns true when password matches the hash", async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.comparePasswords("plaintext", "hash");

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith("plaintext", "hash");
    });

    it("returns false when password does not match the hash", async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.comparePasswords("wrong", "hash");

      expect(result).toBe(false);
    });
  });

  // ─── generateToken ──────────────────────────────────────────────────────────

  describe("generateToken", () => {
    it("returns the signed JWT string", async () => {
      (mockJwt.sign as jest.Mock).mockReturnValue("token.jwt.string");

      const result = await authService.generateToken({ userId: 1, email: "ada@example.com" });

      expect(result).toBe("token.jwt.string");
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: 1, email: "ada@example.com" },
        "test-secret",
        { expiresIn: "1h" },
      );
    });
  });

  // ─── verifyToken ────────────────────────────────────────────────────────────

  describe("verifyToken", () => {
    it("returns the decoded payload for a valid token", () => {
      const payload = { userId: 1, email: "ada@example.com" };
      (mockJwt.verify as jest.Mock).mockReturnValue(payload);

      const result = authService.verifyToken("valid.jwt.token");

      expect(result).toEqual(payload);
      expect(mockJwt.verify).toHaveBeenCalledWith(
        "valid.jwt.token",
        "test-secret",
      );
    });

    it("throws when the token is invalid or expired", () => {
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt expired");
      });

      expect(() => authService.verifyToken("bad.token")).toThrow(
        "Invalid or expired token",
      );
    });
  });
});
