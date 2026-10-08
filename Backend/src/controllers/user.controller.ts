import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import type {
  CreateUserInput,
  UpdateUserAdminInput,
  UpdateUserSelfInput,
  ResetPasswordInput,
  UserQueryInput,
} from '../validators/user.validator.js';

export class UserController {
  async listUsers(
    req: Request<unknown, unknown, unknown, UserQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await userService.listUsers(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async createUser(
    req: Request<unknown, unknown, CreateUserInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await userService.createUser(
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserAdmin(
    req: Request<{ id: string }, unknown, UpdateUserAdminInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await userService.updateUserAdmin(
        req.params.id,
        req.body,
        req.user!,
        undefined,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(
    req: Request<{ id: string }, unknown, ResetPasswordInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await userService.resetPassword(
        req.params.id,
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async updateUserSelf(
    req: Request<unknown, unknown, UpdateUserSelfInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await userService.updateUserSelf(
        req.user!._id,
        req.body,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserAudit(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await userService.getUserAudit(req.params.id, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async unlockUser(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await userService.unlockUser(
        req.params.id,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'User account unlocked successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
