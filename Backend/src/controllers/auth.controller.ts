import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../services/auth.service.js';
import { getRefreshCookieOptions } from '../utils/jwt.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, req.get('user-agent'));

  res.cookie(
    'refreshToken',
    result.refreshToken,
    getRefreshCookieOptions()
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, req.get('user-agent'));

  res.cookie(
    'refreshToken',
    result.refreshToken,
    getRefreshCookieOptions()
  );

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  const result = await authService.refresh(refreshToken, req.get('user-agent'));

  res.cookie(
    'refreshToken',
    result.refreshToken,
    getRefreshCookieOptions()
  );

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  await authService.logout(refreshToken);

  res.clearCookie('refreshToken', getRefreshCookieOptions({ isClear: true }));

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.id);

  res.clearCookie('refreshToken', getRefreshCookieOptions({ isClear: true }));

  res.status(200).json({
    success: true,
    message: 'All sessions logged out successfully',
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body);

    res.clearCookie('refreshToken', getRefreshCookieOptions({ isClear: true }));

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json(result);
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.resetPassword(req.body);
    res.clearCookie('refreshToken', getRefreshCookieOptions({ isClear: true }));
    res.status(200).json(result);
  }
);
