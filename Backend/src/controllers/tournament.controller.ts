import type { Request, Response, NextFunction } from 'express';
import { tournamentService } from '../services/tournament.service.js';

export class TournamentController {
  // Tournaments
  async createTournament(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tournament = await tournamentService.createTournament(req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(201).json({
        data: tournament,
        message: 'Tournament created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async listTournaments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentService.listTournaments(req.query, req.user ? {
        id: req.user.id,
        role: req.user.role,
      } : undefined);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTournamentById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const tournament = await tournamentService.getTournamentById(req.params.id, req.user ? {
        id: req.user.id,
        role: req.user.role,
      } : undefined);
      res.status(200).json({ data: tournament });
    } catch (err) {
      next(err);
    }
  }

  async updateTournament(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const tournament = await tournamentService.updateTournament(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({
        data: tournament,
        message: 'Tournament updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTournament(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      await tournamentService.deleteTournament(req.params.id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ message: 'Tournament deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Registrations
  async registerTeam(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const reg = await tournamentService.registerTeam(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(201).json({
        data: reg,
        message: 'Team registered successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async listRegistrations(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const regs = await tournamentService.listRegistrations(req.params.id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ data: regs });
    } catch (err) {
      next(err);
    }
  }

  async updateSquad(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const reg = await tournamentService.updateSquad(req.params.id, req.body.squad, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({
        data: reg,
        message: 'Squad updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async reviewRegistration(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const reg = await tournamentService.reviewRegistration(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({
        data: reg,
        message: 'Registration reviewed successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async withdrawRegistration(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      await tournamentService.withdrawRegistration(req.params.id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ message: 'Registration withdrawn successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Venues
  async createVenue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const venue = await tournamentService.createVenue(req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(201).json({
        data: venue,
        message: 'Venue created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async listVenues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const venues = await tournamentService.listVenues(req.user ? {
        id: req.user.id,
        role: req.user.role,
      } : undefined);
      res.status(200).json({ data: venues });
    } catch (err) {
      next(err);
    }
  }

  async updateVenue(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const venue = await tournamentService.updateVenue(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({
        data: venue,
        message: 'Venue updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteVenue(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      await tournamentService.deleteVenue(req.params.id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ message: 'Venue deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Officials
  async createOfficial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const official = await tournamentService.createOfficial(req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(201).json({
        data: official,
        message: 'Official created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async listOfficials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const officials = await tournamentService.listOfficials(req.user ? {
        id: req.user.id,
        role: req.user.role,
      } : undefined);
      res.status(200).json({ data: officials });
    } catch (err) {
      next(err);
    }
  }

  async updateOfficial(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const official = await tournamentService.updateOfficial(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({
        data: official,
        message: 'Official updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteOfficial(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      await tournamentService.deleteOfficial(req.params.id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ message: 'Official deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Matches
  async createMatch(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const match = await tournamentService.createMatch(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(201).json({
        data: match,
        message: 'Match created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async listMatches(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const matches = await tournamentService.listMatches(req.params.id, req.user ? {
        id: req.user.id,
        role: req.user.role,
      } : undefined);
      res.status(200).json({ data: matches });
    } catch (err) {
      next(err);
    }
  }

  async getMatchById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const match = await tournamentService.getMatchById(req.params.id, req.user ? {
        id: req.user.id,
        role: req.user.role,
      } : undefined);
      res.status(200).json({ data: match });
    } catch (err) {
      next(err);
    }
  }

  async updateMatch(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const match = await tournamentService.updateMatch(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({
        data: match,
        message: 'Match updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async enterMatchResult(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const match = await tournamentService.enterMatchResult(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({
        data: match,
        message: 'Match result entered successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteMatch(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      await tournamentService.deleteMatch(req.params.id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ message: 'Match deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Public Endpoints
  async getPublicTournaments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentService.getPublicTournaments(req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPublicTournamentById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const tournament = await tournamentService.getPublicTournamentById(req.params.id);
      res.status(200).json({ data: tournament });
    } catch (err) {
      next(err);
    }
  }

  async getPublicTournamentMatches(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const matches = await tournamentService.getPublicTournamentMatches(req.params.id);
      res.status(200).json({ data: matches });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // LIVE MATCH CENTER (STEP 9A)
  // ==========================================

  async getAssignedMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matches = await tournamentService.getAssignedMatches({
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ data: matches });
    } catch (err) {
      next(err);
    }
  }

  async updateMatchStatus(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const match = await tournamentService.updateMatchStatus(
        req.params.id,
        req.body.status,
        {
          id: req.user!.id,
          role: req.user!.role,
        }
      );
      res.status(200).json({
        data: match,
        message: 'Match status updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async createMatchEvent(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await tournamentService.createMatchEvent(
        req.params.id,
        req.body,
        {
          id: req.user!.id,
          role: req.user!.role,
        }
      );
      res.status(201).json({
        data: event,
        message: 'Match event recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getMatchEvents(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await tournamentService.getMatchEvents(
        req.params.id,
        {
          id: req.user!.id,
          role: req.user!.role,
        }
      );
      res.status(200).json({ data: events });
    } catch (err) {
      next(err);
    }
  }

  async deleteMatchEvent(
    req: Request<{ id: string; eventId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await tournamentService.deleteMatchEvent(
        req.params.id,
        req.params.eventId,
        {
          id: req.user!.id,
          role: req.user!.role,
        }
      );
      res.status(200).json({ message: 'Match event deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getMatchReport(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await tournamentService.getMatchReport(
        req.params.id,
        false,
        req.user
          ? {
              id: req.user.id,
              role: req.user.role,
            }
          : undefined
      );
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  }

  async getPublicLiveMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const data = await tournamentService.getPublicLiveMatches();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getPublicMatchById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const data = await tournamentService.getPublicMatchById(req.params.id);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getPublicTournamentStandings(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const data = await tournamentService.getTournamentStandings(req.params.id);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getPublicTournamentTopScorers(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const data = await tournamentService.getTournamentTopScorers(req.params.id);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getPublicMatchReport(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const data = await tournamentService.getMatchReport(req.params.id, true);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const tournamentController = new TournamentController();
