import { z } from "zod";
import { participationSchema } from "./participation";

// Get hackathon:
export const hackathonSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  url: z.string(),
  description: z.string(),
  rules: z.string().optional(),
  criteria: z.string().optional(),
  is_finished: z.boolean(),
  owner: z.string().min(3),
  creation_date: z.date(),
  participants: z.array(participationSchema),
});

export type allHackathons = z.TypeOf<typeof hackathonSchema>;

// -----------------------------------------------

// Create new hackathon:
export const newHackathonSchema = z.object({
  name: z.string().min(3),
  url: z.string(),
  description: z.string(),
  rules: z.string().optional(),
  criteria: z.string().optional(),
  prizes: z.string().max(2000).optional(),
  matchmaking: z.string().max(2000).optional(),
  categories: z.string().max(500).optional(),
  organizers: z.string().max(500).optional(),
  judges_info: z.string().max(2000).optional(),
  timeline: z.array(z.string()).max(10).optional(),
  sponsors: z.array(z.object({ name: z.string(), logo: z.string().optional(), website: z.string().optional() })).optional(),
  sponsors_text: z.string().max(2000).optional(),
  is_finished: z.boolean(),
  max_winners_displayed: z.number().int().min(1).max(20).optional(),
});

export type newHackathon = z.TypeOf<typeof newHackathonSchema>;

// -----------------------------------------------

// Update hackathon:
export const updateHackathonSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  description: z.string(),
  rules: z.string().optional(),
  criteria: z.string().optional(),
  prizes: z.string().max(2000).optional(),
  matchmaking: z.string().max(2000).optional(),
  categories: z.string().max(500).optional(),
  organizers: z.string().max(500).optional(),
  judges_info: z.string().max(2000).optional(),
  timeline: z.array(z.string()).max(10).optional(),
  sponsors: z.array(z.object({ name: z.string(), logo: z.string().optional(), website: z.string().optional() })).optional(),
  sponsors_text: z.string().max(2000).optional(),
  is_finished: z.boolean(),
  max_winners_displayed: z.number().int().min(1).max(20).optional(),
});

export type updateHackathon = z.TypeOf<typeof updateHackathonSchema>;
// -----------------------------------------------

// Filter hackathon:

export const filterHackathonSchema = z.object({
  filter: z.string(),
});

export type filterHackathon = z.TypeOf<typeof filterHackathonSchema>;
