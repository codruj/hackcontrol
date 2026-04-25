export type TParticipation = {
  id?: string;
  is_reviewed: boolean;
  is_winner: boolean;
  title: string;
  description: string;
  project_url: string;
  presentation_url?: string;
  hackathon_url: string;
  hackathon_name: string;
  team_members?: {
    team_name?: string;
    members: Array<{
      name: string;
      email: string;
      role?: string;
    }>;
  };
};
