import { api } from "@/trpc/api";
import { useState } from "react";
import { Button } from "@/ui";
import { Cancel } from "@/ui/icons";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

interface Slot {
  id: string;
  startTime: Date;
  endTime: Date;
  topic: string | null;
  isBooked: boolean;
  bookingNote: string | null;
  bookedById: string | null;
  mentor: {
    id: string;
    bio: string | null;
    expertise: string | null;
    user: { id: string; name: string | null; email: string | null; image: string | null };
  };
  bookedBy: { id: string; name: string | null; email: string | null } | null;
}

interface BookDialogProps {
  slot: Slot;
  currentUserId: string;
  hackathonId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function BookDialog({ slot, currentUserId, hackathonId, onClose, onSuccess }: BookDialogProps) {
  const [note, setNote] = useState("");

  const bookMutation = api.mentor.bookSlot.useMutation({
    onSuccess: () => { toast.success("Slot booked!"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message || "Failed to book slot"),
  });

  const cancelMutation = api.mentor.cancelBooking.useMutation({
    onSuccess: () => { toast.success("Booking cancelled"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message || "Failed to cancel"),
  });

  const isMyBooking = slot.bookedById === currentUserId;
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-700 p-4">
        <p className="font-medium text-white">
          {start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <p className="text-neutral-400">
          {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </p>
        {slot.topic && <p className="mt-1 text-sm text-amber-400">{slot.topic}</p>}
      </div>

      {isMyBooking ? (
        <div>
          <div className="mb-3 rounded-lg border border-green-800/40 bg-green-900/10 p-3 text-sm text-green-400">
            You have booked this slot.
            {slot.bookingNote && <p className="mt-1 text-neutral-300">Your message: "{slot.bookingNote}"</p>}
          </div>
          <Button
            icon={<Cancel width={16} />}
            onClick={() => cancelMutation.mutate({ slotId: slot.id, hackathonId })}
            loadingstatus={cancelMutation.isLoading}
            disabled={cancelMutation.isLoading}
          >
            Cancel my booking
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Message / Topic (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Briefly describe what you'd like to discuss..."
              className="block w-full resize-none rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white placeholder-neutral-400 focus:border-neutral-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => bookMutation.mutate({ slotId: slot.id, hackathonId, bookingNote: note || undefined })}
              loadingstatus={bookMutation.isLoading}
              disabled={bookMutation.isLoading}
            >
              Confirm booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MentorBookingProps {
  hackathonId: string;
  currentUserId: string;
  isOrganizer: boolean;
}

const MentorBooking = ({ hackathonId, currentUserId, isOrganizer }: MentorBookingProps) => {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const { data: slots, refetch } = api.mentor.getSlots.useQuery({ hackathonId });

  const slotList = (slots as Slot[] | undefined) ?? [];

  const grouped = slotList.reduce<Record<string, { mentor: Slot["mentor"]; slots: Slot[] }>>((acc, slot) => {
    const key = slot.mentor.user.id;
    if (!acc[key]) acc[key] = { mentor: slot.mentor, slots: [] };
    acc[key]!.slots.push(slot);
    return acc;
  }, {});

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 py-12 text-center">
        <p className="text-neutral-400">No mentors have added availability slots yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.values(grouped).map(({ mentor, slots: mentorSlots }) => (
        <div key={mentor.user.id} className="rounded-lg border border-neutral-800 p-5">
          <div className="mb-4 flex items-start gap-4">
            {mentor.user.image && (
              <img src={mentor.user.image} alt={mentor.user.name ?? ""} className="h-12 w-12 flex-shrink-0 rounded-full" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">{mentor.user.name}</h3>
              {mentor.expertise && <p className="text-sm text-amber-400">{mentor.expertise}</p>}
              {mentor.bio && <p className="mt-1 text-sm text-neutral-400">{mentor.bio}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mentorSlots
              .filter((s) => new Date(s.endTime) > new Date())
              .map((slot) => {
                const start = new Date(slot.startTime);
                const end = new Date(slot.endTime);
                const isMyBooking = slot.bookedById === currentUserId;

                return (
                  <button
                    key={slot.id}
                    onClick={() => !slot.isBooked || isMyBooking ? setSelectedSlot(slot) : undefined}
                    disabled={slot.isBooked && !isMyBooking}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      isMyBooking
                        ? "border-green-700/50 bg-green-900/10 hover:bg-green-900/20"
                        : slot.isBooked
                          ? "cursor-not-allowed border-neutral-700 opacity-50"
                          : "border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/40"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">
                      {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {slot.topic && <p className="mt-1 truncate text-xs text-amber-400">{slot.topic}</p>}
                    <p className={`mt-1.5 text-xs font-medium ${isMyBooking ? "text-green-400" : slot.isBooked ? "text-neutral-500" : "text-neutral-400"}`}>
                      {isMyBooking ? "Your booking" : slot.isBooked ? "Unavailable" : "Available"}
                    </p>
                  </button>
                );
              })}
          </div>

          {isOrganizer && mentorSlots.some((s) => s.isBooked) && (
            <div className="mt-4 border-t border-neutral-800 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Booked sessions</p>
              <div className="space-y-2">
                {mentorSlots.filter((s) => s.isBooked).map((slot) => {
                  const start = new Date(slot.startTime);
                  return (
                    <div key={slot.id} className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm">
                      <span className="text-neutral-300">
                        {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                        {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-white">{slot.bookedBy?.name || slot.bookedBy?.email || "Unknown"}</span>
                      {slot.bookingNote && <span className="max-w-[200px] truncate text-neutral-400">"{slot.bookingNote}"</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <Dialog.Root open={!!selectedSlot} onOpenChange={(o) => !o && setSelectedSlot(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[90vw] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-neutral-800 bg-midnight p-6 shadow-2xl focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-xl font-medium">
                {selectedSlot?.bookedById === currentUserId ? "Your Booking" : "Book a Session"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Cancel width={22} className="cursor-pointer text-gray-400 transition-all hover:scale-105" />
              </Dialog.Close>
            </div>
            {selectedSlot && (
              <BookDialog
                slot={selectedSlot}
                currentUserId={currentUserId}
                hackathonId={hackathonId}
                onClose={() => setSelectedSlot(null)}
                onSuccess={() => { setSelectedSlot(null); refetch(); }}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MentorBooking;
