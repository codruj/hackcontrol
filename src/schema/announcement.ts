import { z } from "zod";

// Get announcement schema
export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  important: z.boolean(),
  hackathonId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Announcement = z.TypeOf<typeof announcementSchema>;

// Create new announcement
export const newAnnouncementSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
  important: z.boolean().optional().default(false),
  hackathonId: z.string(),
});

export type NewAnnouncement = z.TypeOf<typeof newAnnouncementSchema>;

// Update announcement
export const updateAnnouncementSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).optional(),
  important: z.boolean().optional(),
});

export type UpdateAnnouncement = z.TypeOf<typeof updateAnnouncementSchema>;

// Delete announcement
export const deleteAnnouncementSchema = z.object({
  id: z.string(),
});

export type DeleteAnnouncement = z.TypeOf<typeof deleteAnnouncementSchema>;
