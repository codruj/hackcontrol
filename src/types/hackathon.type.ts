export type THackathon = {
  id?: string;
  name: string;
  url: string;
  description: string;
  rules?: string;
  criteria?: string;
  prizes?: string;
  matchmaking?: string;
  categories?: string;
  organizers?: string;
  judges_info?: string;
  sponsors?: { name: string; logo?: string; website?: string }[];
  sponsors_text?: string;
  is_finished: boolean;
  max_winners_displayed?: number;
  owner: string;
  creation_date: Date;
};
