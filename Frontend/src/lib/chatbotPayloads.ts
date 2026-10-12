export interface BuildChatbotMessageInput {
  message: string;
}

/**
 * Pure payload builder for chatbot message sending.
 * Conforms 1:1 with Backend chatbotMessageSchema (.strict()).
 */
export function buildChatbotMessagePayload(
  input: BuildChatbotMessageInput
): { message: string } {
  return {
    message: typeof input.message === 'string' ? input.message.trim() : '',
  };
}

export type Role = 'Admin' | 'Coach' | 'Athlete' | 'Organizer' | 'Official';

export interface PromptChip {
  id: string;
  label: string;
  prompt: string;
}

export const ROLE_SUGGESTION_CHIPS: Record<Role, readonly PromptChip[]> = {
  Admin: [
    { id: 'admin-overview', label: 'Academy Overview', prompt: 'academy overview' },
    { id: 'admin-pending-reg', label: 'Pending Registrations', prompt: 'pending registrations count' },
    { id: 'admin-unread-contact', label: 'Unread Inquiries', prompt: 'unread contact messages' },
    { id: 'admin-programs', label: 'Sports Programs', prompt: 'sports programs' },
    { id: 'admin-live-matches', label: 'Live Matches', prompt: 'live matches' },
    { id: 'admin-notifications', label: 'Notifications', prompt: 'my notifications' },
  ],
  Coach: [
    { id: 'coach-teams', label: 'My Teams', prompt: 'my teams' },
    { id: 'coach-roster', label: 'Team Roster', prompt: 'team roster' },
    { id: 'coach-sessions', label: 'Upcoming Sessions', prompt: 'upcoming sessions' },
    { id: 'coach-attendance', label: 'Team Attendance', prompt: 'team attendance' },
    { id: 'coach-standings', label: 'Tournament Standings', prompt: 'tournament standings' },
    { id: 'coach-notifications', label: 'Notifications', prompt: 'my notifications' },
  ],
  Athlete: [
    { id: 'athlete-profile', label: 'My Profile', prompt: 'my profile' },
    { id: 'athlete-attendance', label: 'My Attendance', prompt: 'my attendance' },
    { id: 'athlete-sessions', label: 'Upcoming Sessions', prompt: 'upcoming sessions' },
    { id: 'athlete-goals', label: 'My Goals', prompt: 'my goals' },
    { id: 'athlete-feedback', label: 'Coach Feedback', prompt: 'coach feedback' },
    { id: 'athlete-assessment', label: 'Latest Assessment', prompt: 'latest assessment' },
  ],
  Organizer: [
    { id: 'organizer-tourneys', label: 'My Tournaments', prompt: 'my tournaments' },
    { id: 'organizer-reg-summary', label: 'Registrations Summary', prompt: 'registrations summary' },
    { id: 'organizer-matches', label: 'Upcoming Matches', prompt: 'upcoming matches' },
    { id: 'organizer-live', label: 'Live Scores', prompt: 'live matches' },
    { id: 'organizer-standings', label: 'Tournament Standings', prompt: 'tournament standings' },
    { id: 'organizer-notifications', label: 'Notifications', prompt: 'my notifications' },
  ],
  Official: [
    { id: 'official-assigned', label: 'Assigned Matches', prompt: 'my assigned matches' },
    { id: 'official-live', label: 'Live Matches', prompt: 'live matches' },
    { id: 'official-programs', label: 'Sports Programs', prompt: 'sports programs' },
    { id: 'official-standings', label: 'Tournament Standings', prompt: 'tournament standings' },
    { id: 'official-notifications', label: 'Notifications', prompt: 'my notifications' },
    { id: 'official-overview', label: 'Academy Overview', prompt: 'academy overview' },
  ],
} as const;

export function getSuggestionChipsForRole(role: string): readonly PromptChip[] {
  if (role in ROLE_SUGGESTION_CHIPS) {
    return ROLE_SUGGESTION_CHIPS[role as Role];
  }
  return ROLE_SUGGESTION_CHIPS.Athlete;
}
