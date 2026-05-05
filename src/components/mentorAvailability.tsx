import { api } from "@/trpc/api";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/ui";
import { Plus, Cancel, SaveFloppyDisk, Settings } from "@/ui/icons";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

interface SlotFormValues {
  startDate: string;
  startTime: string;
  endTime: string;
  topic: string;
}

interface Slot {
  id: string;
  startTime: Date;
  endTime: Date;
  topic: string | null;
  isBooked: boolean;
  bookingNote: string | null;
  bookedBy: { id: string; name: string | null; email: string | null } | null;
}

function SlotForm({
  onSuccess,
  onCancel,
  hackathonId,
  slot,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  hackathonId: string;
  slot?: Slot;
}) {
  const isEdit = !!slot;
  const defaultStart = slot ? new Date(slot.startTime) : null;
  const defaultEnd = slot ? new Date(slot.endTime) : null;

  const { register, handleSubmit, formState: { errors } } = useForm<SlotFormValues>({
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
      createMutation.mutate({ hackathonId, startTime, endTime, topic: data.topic || undefined });
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

interface MentorAvailabilityProps {
  hackathonId: string;
}

const MentorAvailability = ({ hackathonId }: MentorAvailabilityProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);

  const { data: allSlots, refetch } = api.mentor.getSlots.useQuery({ hackathonId });

  const deleteMutation = api.mentor.deleteSlot.useMutation({
    onSuccess: () => { refetch(); toast.success("Slot deleted"); },
    onError: (e) => toast.error(e.message || "Failed to delete slot"),
  });

  const cancelBookingMutation = api.mentor.cancelBooking.useMutation({
    onSuccess: () => { refetch(); toast.success("Booking cancelled"); },
    onError: (e) => toast.error(e.message || "Failed to cancel booking"),
  });

  const mySlots = (allSlots as Slot[] | undefined)?.filter((s) => true) ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Availability</h3>
        <Button icon={<Plus width={16} />} onClick={() => setIsCreateOpen(true)}>
          Add Slot
        </Button>
      </div>

      {mySlots.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 py-8 text-center text-gray-400">
          No slots added yet. Add your first availability slot.
        </div>
      ) : (
        <div className="space-y-3">
          {mySlots.map((slot) => {
            const start = new Date(slot.startTime);
            const end = new Date(slot.endTime);
            const isPast = end < new Date();
            return (
              <div key={slot.id} className={`rounded-lg border p-4 ${slot.isBooked ? "border-amber-700/50 bg-amber-900/10" : isPast ? "border-neutral-700 opacity-60" : "border-neutral-700"}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
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
                    {slot.isBooked && slot.bookedBy && (
                      <div className="mt-2 rounded-lg border border-amber-800/30 bg-amber-900/10 p-2 text-sm">
                        <span className="text-amber-300">Booked by: </span>
                        <span className="text-white">{slot.bookedBy.name || slot.bookedBy.email}</span>
                        {slot.bookingNote && (
                          <p className="mt-1 text-neutral-300">"{slot.bookingNote}"</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    {slot.isBooked ? (
                      <Button
                        icon={<Cancel width={14} />}
                        onClick={() => { if (confirm("Cancel this booking?")) cancelBookingMutation.mutate({ slotId: slot.id, hackathonId }); }}
                        disabled={cancelBookingMutation.isLoading}
                      >
                        Cancel booking
                      </Button>
                    ) : (
                      <>
                        <Button icon={<Settings width={14} />} onClick={() => setEditingSlot(slot)}>Edit</Button>
                        <Button
                          icon={<Cancel width={14} />}
                          onClick={() => { if (confirm("Delete this slot?")) deleteMutation.mutate({ slotId: slot.id, hackathonId }); }}
                          disabled={deleteMutation.isLoading}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[90vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-neutral-800 bg-midnight p-6 shadow-2xl focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-xl font-medium">Add Availability Slot</Dialog.Title>
              <Dialog.Close asChild>
                <Cancel width={22} className="cursor-pointer text-gray-400 transition-all hover:scale-105" />
              </Dialog.Close>
            </div>
            <SlotForm
              hackathonId={hackathonId}
              onSuccess={() => { setIsCreateOpen(false); refetch(); }}
              onCancel={() => setIsCreateOpen(false)}
            />
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
              <SlotForm
                hackathonId={hackathonId}
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

export default MentorAvailability;
