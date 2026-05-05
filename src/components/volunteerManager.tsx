import { api } from "@/trpc/api";
import { useState } from "react";
import { Button } from "@/ui";
import { Plus, Cancel } from "@/ui/icons";
import VolunteerUserSearch from "./volunteerUserSearch";
import { toast } from "sonner";

interface VolunteerManagerProps {
  hackathonId: string;
}

const VolunteerManager = ({ hackathonId }: VolunteerManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);

  const { data: volunteers, isLoading, refetch } = api.volunteer.getHackathonVolunteers.useQuery({ hackathonId });

  const addMutation = api.volunteer.addVolunteer.useMutation({
    onSuccess: (v) => {
      refetch();
      toast.success(`${v.user.name} added as volunteer`);
      setIsAdding(false);
    },
    onError: (err) => toast.error(err.message || "Failed to add volunteer"),
  });

  const removeMutation = api.volunteer.removeVolunteer.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Volunteer removed");
    },
    onError: (err) => toast.error(err.message || "Failed to remove volunteer"),
  });

  const handleAdd = (user: { id: string; name: string; email: string }) => {
    addMutation.mutate({ hackathonId, userId: user.id });
  };

  const handleRemove = (userId: string) => {
    if (confirm("Remove this volunteer from the hackathon?")) {
      removeMutation.mutate({ hackathonId, userId });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-800 p-6">
        <h3 className="mb-4 text-lg font-semibold">Volunteer Management</h3>
        <div className="text-gray-400">Loading volunteers...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Volunteer Management</h3>
        {!isAdding && (
          <Button icon={<Plus width={16} />} onClick={() => setIsAdding(true)}>
            Add Volunteer
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 space-y-3 rounded-lg border border-neutral-700 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Invite New Volunteer</h4>
            <Button
              icon={<Cancel width={16} />}
              onClick={() => setIsAdding(false)}
              disabled={addMutation.isLoading}
            >
              Cancel
            </Button>
          </div>
          <VolunteerUserSearch
            hackathonId={hackathonId}
            onUserSelect={handleAdd}
            disabled={addMutation.isLoading}
          />
          {addMutation.isLoading && (
            <div className="text-sm text-gray-400">Adding volunteer...</div>
          )}
        </div>
      )}

      {volunteers && volunteers.length > 0 ? (
        <div>
          <h4 className="mb-3 font-medium text-gray-300">
            Current Volunteers ({volunteers.length})
          </h4>
          <div className="space-y-3">
            {(volunteers as Array<{ id: string; userId: string; user: { id: string; name: string | null; email: string | null }; inviter: { id: string; name: string | null } | null }>).map((vol) => (
              <div
                key={vol.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-neutral-700 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">{vol.user.name}</div>
                  <div className="truncate text-sm text-gray-400">{vol.user.email}</div>
                  {vol.inviter && (
                    <div className="mt-1">
                      <span className="inline-block rounded-full bg-purple-600/20 px-2 py-1 text-xs text-purple-400">
                        Invited by {vol.inviter.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button
                    icon={<Cancel width={16} />}
                    onClick={() => handleRemove(vol.userId)}
                    disabled={removeMutation.isLoading}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="text-gray-400">No volunteers assigned yet</div>
          <div className="mt-2 text-sm text-gray-500">
            Add volunteers to help run this hackathon
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerManager;
