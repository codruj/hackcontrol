import { api } from "@/trpc/api";
import { useState } from "react";
import { Button } from "@/ui";
import { Plus, Cancel } from "@/ui/icons";
import MentorUserSearch from "./mentorUserSearch";
import { toast } from "sonner";

interface MentorManagerProps {
  hackathonId: string;
}

const MentorManager = ({ hackathonId }: MentorManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);

  const { data: mentors, isLoading, refetch } = api.mentor.getHackathonMentors.useQuery({ hackathonId });

  const addMutation = api.mentor.addMentor.useMutation({
    onSuccess: (m) => { refetch(); toast.success(`${m.user.name} added as mentor`); setIsAdding(false); },
    onError: (e) => toast.error(e.message || "Failed to add mentor"),
  });

  const removeMutation = api.mentor.removeMentor.useMutation({
    onSuccess: () => { refetch(); toast.success("Mentor removed"); },
    onError: (e) => toast.error(e.message || "Failed to remove mentor"),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-800 p-6">
        <h3 className="mb-4 text-lg font-semibold">Mentor Management</h3>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mentor Management</h3>
        {!isAdding && (
          <Button icon={<Plus width={16} />} onClick={() => setIsAdding(true)}>
            Add Mentor
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 space-y-3 rounded-lg border border-neutral-700 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Invite New Mentor</h4>
            <Button icon={<Cancel width={16} />} onClick={() => setIsAdding(false)} disabled={addMutation.isLoading}>
              Cancel
            </Button>
          </div>
          <MentorUserSearch
            hackathonId={hackathonId}
            onUserSelect={(u) => addMutation.mutate({ hackathonId, userId: u.id })}
            disabled={addMutation.isLoading}
          />
        </div>
      )}

      {mentors && mentors.length > 0 ? (
        <div>
          <h4 className="mb-3 font-medium text-gray-300">Current Mentors ({mentors.length})</h4>
          <div className="space-y-3">
            {(mentors as Array<{ id: string; userId: string; bio: string | null; expertise: string | null; user: { id: string; name: string | null; email: string | null; image: string | null }; inviter: { id: string; name: string | null } | null }>).map((m) => (
              <div key={m.id} className="flex flex-col justify-between gap-3 rounded-lg border border-neutral-700 p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {m.user.image && (
                    <img src={m.user.image} alt={m.user.name ?? ""} className="h-8 w-8 flex-shrink-0 rounded-full" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{m.user.name}</div>
                    <div className="truncate text-sm text-gray-400">{m.user.email}</div>
                    {m.expertise && <div className="mt-0.5 text-xs text-amber-400">{m.expertise}</div>}
                    {m.inviter && (
                      <span className="mt-1 inline-block rounded-full bg-amber-600/20 px-2 py-0.5 text-xs text-amber-400">
                        Invited by {m.inviter.name}
                      </span>
                    )}
                  </div>
                </div>
                <Button icon={<Cancel width={16} />} onClick={() => { if (confirm("Remove this mentor?")) removeMutation.mutate({ hackathonId, userId: m.userId }); }} disabled={removeMutation.isLoading}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="text-gray-400">No mentors assigned yet</div>
          <div className="mt-2 text-sm text-gray-500">Add mentors to provide guidance to participants</div>
        </div>
      )}
    </div>
  );
};

export default MentorManager;
