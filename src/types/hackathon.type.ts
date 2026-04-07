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
  is_finished: boolean;
  owner: string;
  creation_date: Date;
};
