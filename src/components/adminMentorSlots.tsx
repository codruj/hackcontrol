import { api } from "@/trpc/api";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/ui";
import { Plus, Cancel, SaveFloppyDisk, Settings, ArrowDown } from "@/ui/icons";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

interface SlotFormValues {
  startDate: string;
  startTime: string;
  endTime: string;
  topic: string;
}

interface AdminSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  topic: string | null;
  isBooked: boolean;
  bookingTeamName: string | null;
  bookingPurpose: string | null;
  bookingNote: string | null;
  bookedBy: { id: string; name: string | null; email: string | null } | null;
  mentor: {
    id: string;
    bio: string | null;
    expertise: string | null;
    user: { id: string; name: string | null; email: string | null; image: string | null };
  };
}

interface MentorRecord {
  id: string;
  userId: string;
  company: string | null;
  bio: string | null;
  expertise: string | null;
  user: { id: string; name: string | null; email: string | null; image: string | null };
  inviter: { id: string; name: string | null } | null;
}

function AdminSlotForm({
  hackathonId,
  mentorUserId,
  slot,
  onSuccess,
  onCancel,
}: {
  hackathonId: string;
  mentorUserId: string;
  slot?: AdminSlot;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!slot;
  const defaultStart = slot ? new Date(slot.startTime) : null;
  const defaultEnd = slot ? new Date(slot.endTime) : null;

  const { register, handleSubmit } = useForm<SlotFormValues>({
    defaultValues: {
      startDate: defaultStart ? defaultStart.toISOString().split("T")[0] : "",
      startTime: defaultStart ? defaultStart.toTimeString().slice(0, 5) : "",
      endTime: defaultEnd ? defaultEnd.toTimeString().slice(0, 5) : "",
      topic: slot?.topic ?? "",
    },
  });

  const createMutation = api.mentor.createSlot.useMutation({
    onSuccess: () => { toast.success("Slot created"); onSuccess(); },
    onError: (e) => toast.error(e.message || "Failed to create slot"),
  });

  const updateMutation = api.mentor.updateSlot.useMutation({
    onSuccess: () => { toast.success("Slot updated"); onSuccess(); },
    onError: (e) => toast.error(e.message || "Failed to update slot"),
  });

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  const onSubmit = (data: SlotFormValues) => {
    const startTime = new Date(`${data.startDate}T${data.startTime}`);
    const endTime = new Date(`${data.startDate}T${data.endTime}`);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      toast.error("Invalid date or time");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }
    if (isEdit) {
      updateMutation.mutate({ slotId: slot!.id, hackathonId, startTime, endTime, topic: data.topic || null });
    } else {
      createMutation.mutate({ hackathonId, mentorUserId, startTime, endTime, topic: data.topic || undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">Date *</label>
        <input
          type="date"
          {...register("startDate", { required: true })}
          className="focus:ring-primary-500 block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white focus:border-transparent focus:rounded focus:outline outline-neutral-600 outline-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">Start time *</label>
          <input
            type="time"
            {...register("startTime", { required: true })}
            className="focus:ring-primary-500 block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white focus:border-transparent focus:rounded focus:outline outline-neutral-600 outline-1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">End time *</label>
          <input
            type="time"
            {...register("endTime", { required: true })}
            className="focus:ring-primary-500 block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white focus:border-transparent focus:rounded focus:outline outline-neutral-600 outline-1"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">Topic (optional)</label>
        <input
          type="text"
          {...register("topic")}
          placeholder="e.g. Technical review, Business model feedback..."
          className="focus:ring-primary-500 block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white placeholder-neutral-400 focus:border-transparent focus:rounded focus:outline outline-neutral-600 outline-1"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button type="submit" icon={<SaveFloppyDisk width={16} />} loadingstatus={isSaving} disabled={isSaving}>
          {isEdit ? "Save changes" : "Add slot"}
        </Button>
      </div>
    </form>
  );
}

interface AdminMentorSlotsProps {
  hackathonId: string;
}

const AdminMentorSlots = ({ hackathonId }: AdminMentorSlotsProps) => {
  const [expandedMentors, setExpandedMentors] = useState<Set<string>>(new Set());
  const [addingForMentor, setAddingForMentor] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<AdminSlot | null>(null);

  const { data: mentors, isLoading: mentorsLoading } = api.mentor.getHackathonMentors.useQuery({ hackathonId });
  const { data: allSlots, refetch } = api.mentor.getSlots.useQuery({ hackathonId });

  const deleteMutation = api.mentor.deleteSlot.useMutation({
    onSuccess: () => { refetch(); toast.success("Slot deleted"); },
    onError: (e) => toast.error(e.message || "Failed to delete slot"),
  });

  const cancelBookingMutation = api.mentor.cancelBooking.useMutation({
    onSuccess: () => { refetch(); toast.success("Booking cancelled"); },
    onError: (e) => toast.error(e.message || "Failed to cancel booking"),
  });

  const mentorList = (mentors as MentorRecord[] | undefined) ?? [];
  const slotList = (allSlots as AdminSlot[] | undefined) ?? [];

  const slotsByMentorUserId = slotList.reduce<Record<string, AdminSlot[]>>((acc, slot) => {
    const uid = slot.mentor.user.id;
    if (!acc[uid]) acc[uid] = [];
    acc[uid]!.push(slot);
    return acc;
  }, {});

  const toggleExpand = (mentorUserId: string) => {
    setExpandedMentors((prev) => {
      const next = new Set(prev);
      if (next.has(mentorUserId)) {
        next.delete(mentorUserId);
      } else {
        next.add(mentorUserId);
      }
      return next;
    });
  };

  const handleDelete = (slot: AdminSlot) => {
    if (slot.isBooked) {
      const teamInfo = slot.bookingTeamName ? ` by ${slot.bookingTeamName}` : "";
      if (!confirm(`This slot is currently booked${teamInfo}. Deleting it will permanently remove the slot and cancel the booking. Continue?`)) return;
    } else {
      if (!confirm("Delete this slot?")) return;
    }
    deleteMutation.mutate({ slotId: slot.id, hackathonId });
  };

  const handleEditClick = (slot: AdminSlot) => {
    if (slot.isBooked) {
      const teamInfo = slot.bookingTeamName ? ` by ${slot.bookingTeamName}` : "";
      if (!confirm(`This slot is currently booked${teamInfo}. The participant will not be automatically notified of changes. Continue editing?`)) return;
    }
    setEditingSlot(slot);
  };

  if (mentorsLoading || mentorList.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-lg font-semibold">Availability Slots</h3>
      <div className="space-y-3">
        {mentorList.map((m) => {
          const mentorSlots = slotsByMentorUserId[m.userId] ?? [];
          const isExpanded = expandedMentors.has(m.userId);
          const bookedCount = mentorSlots.filter((s) => s.isBooked).length;

          return (
            <div key={m.userId} className="rounded-lg border border-neutral-700">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => toggleExpand(m.userId)}
              >
                <div className="flex items-center gap-3">
                  {m.user.image && (
                    <img src={m.user.image} alt={m.user.name ?? ""} className="h-8 w-8 flex-shrink-0 rounded-full" />
                  )}
                  <div>
                    <span className="font-medium text-white">{m.user.name}</span>
                    {m.expertise && <span className="ml-2 text-xs text-amber-400">{m.expertise}</span>}
                    <span className="ml-2 text-xs text-neutral-500">
                      {mentorSlots.length} slot{mentorSlots.length !== 1 ? "s" : ""}
                      {bookedCount > 0 && `, ${bookedCount} booked`}
                    </span>
                  </div>
                </div>
                <ArrowDown
                  width={16}
                  className={`flex-shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-neutral-700 p-4">
                  {mentorSlots.length === 0 ? (
                    <div className="mb-3 text-sm text-neutral-500">No slots added for this mentor yet.</div>
                  ) : (
                    <div className="mb-4 space-y-2">
                      {mentorSlots.map((slot) => {
                        const start = new Date(slot.startTime);
                        const end = new Date(slot.endTime);
                        const isPast = end < new Date();
                        return (
                          <div
                            key={slot.id}
                            className={`rounded-lg border p-3 ${
                              slot.isBooked
                                ? "border-amber-700/50 bg-amber-900/10"
                                : isPast
                                  ? "border-neutral-700 opacity-60"
                                  : "border-neutral-700"
                            }`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-white">
                                    {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                  </span>
                                  <span className="text-neutral-400">
                                    {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                    {" – "}
                                    {end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {slot.isBooked && (
                                    <span className="rounded-full bg-amber-600/20 px-2 py-0.5 text-xs text-amber-400">Booked</span>
                                  )}
                                  {isPast && !slot.isBooked && (
                                    <span className="text-xs text-neutral-500">Past</span>
                                  )}
                                </div>
                                {slot.topic && <div className="mt-1 text-sm text-neutral-400">{slot.topic}</div>}
                                {slot.isBooked && (
                                  <div className="mt-2 space-y-0.5 rounded-lg border border-amber-800/30 bg-amber-900/10 p-2 text-sm">
                                    {slot.bookedBy && (
                                      <p>
                                        <span className="text-amber-300">Booked by: </span>
                                        <span className="text-white">{slot.bookedBy.name || slot.bookedBy.email}</span>
                                      </p>
                                    )}
                                    {slot.bookingTeamName && (
                                      <p><span className="text-neutral-500">Team: </span><span className="text-neutral-200">{slot.bookingTeamName}</span></p>
                                    )}
                                    {slot.bookingPurpose && (
                                      <p><span className="text-neutral-500">Purpose: </span><span className="text-neutral-200">{slot.bookingPurpose}</span></p>
                                    )}
                                    {slot.bookingNote && (
                                      <p><span className="text-neutral-500">Note: </span><span className="text-neutral-300">"{slot.bookingNote}"</span></p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-shrink-0 flex-wrap gap-2">
                                <Button icon={<Settings width={14} />} onClick={() => handleEditClick(slot)}>
                                  Edit
                                </Button>
                                {slot.isBooked && (
                                  <Button
                                    icon={<Cancel width={14} />}
                                    onClick={() => {
                                      const teamInfo = slot.bookingTeamName ? ` by ${slot.bookingTeamName}` : "";
                                      if (confirm(`Cancel the booking${teamInfo} and free up this slot?`)) {
                                        cancelBookingMutation.mutate({ slotId: slot.id, hackathonId });
                                      }
                                    }}
                                    disabled={cancelBookingMutation.isLoading}
                                  >
                                    Cancel booking
                                  </Button>
                                )}
                                <Button
                                  icon={<Cancel width={14} />}
                                  onClick={() => handleDelete(slot)}
                                  disabled={deleteMutation.isLoading}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Button icon={<Plus width={16} />} onClick={() => setAddingForMentor(m.userId)}>
                    Add slot for {m.user.name}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog.Root open={!!addingForMentor} onOpenChange={(o) => !o && setAddingForMentor(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[90vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-neutral-800 bg-midnight p-6 shadow-2xl focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-xl font-medium">Add Availability Slot</Dialog.Title>
              <Dialog.Close asChild>
                <Cancel width={22} className="cursor-pointer text-gray-400 transition-all hover:scale-105" />
              </Dialog.Close>
            </div>
            {addingForMentor && (
              <AdminSlotForm
                hackathonId={hackathonId}
                mentorUserId={addingForMentor}
                onSuccess={() => { setAddingForMentor(null); refetch(); }}
                onCancel={() => setAddingForMentor(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!editingSlot} onOpenChange={(o) => !o && setEditingSlot(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[90vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-neutral-800 bg-midnight p-6 shadow-2xl focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-xl font-medium">Edit Slot</Dialog.Title>
              <Dialog.Close asChild>
                <Cancel width={22} className="cursor-pointer text-gray-400 transition-all hover:scale-105" />
              </Dialog.Close>
            </div>
            {editingSlot && (
              <AdminSlotForm
                hackathonId={hackathonId}
                mentorUserId={editingSlot.mentor.user.id}
                slot={editingSlot}
                onSuccess={() => { setEditingSlot(null); refetch(); }}
                onCancel={() => setEditingSlot(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default AdminMentorSlots;
