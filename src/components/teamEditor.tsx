import { useState } from "react";
import { api } from "@/trpc/api";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface TeamEditorProps {
  hackathonId: string;
  onClose?: () => void;
}

const TeamEditor = ({ hackathonId, onClose }: TeamEditorProps) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const utils = api.useContext();

  const { data: team, isLoading } = api.hackathon.getMyTeam.useQuery({ hackathonId });

  const [editingName, setEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults } = api.hackathon.searchUsersForTeam.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 },
  );

  const updateName = api.hackathon.updateTeamName.useMutation({
    onSuccess: () => {
      toast.success("Team name updated");
      setEditingName(false);
      utils.hackathon.getMyTeam.invalidate({ hackathonId });
    },
    onError: (err) => toast.error(err.message),
  });

  const addMember = api.hackathon.addTeamMember.useMutation({
    onSuccess: () => {
      toast.success("Member added");
      setSearchQuery("");
      utils.hackathon.getMyTeam.invalidate({ hackathonId });
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = api.hackathon.removeTeamMember.useMutation({
    onSuccess: () => {
      utils.hackathon.getMyTeam.invalidate({ hackathonId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }

  if (!team) {
    return (
      <p className="text-sm text-gray-400">
        You are not part of a team in this hackathon yet.
      </p>
    );
  }

  const isLeader = team.leaderId === currentUserId;

  return (
    <div className="space-y-5">
      {/* Team name */}
      <div>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTeamName.trim()) {
                  updateName.mutate({ teamId: team.id, name: newTeamName.trim() });
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              className="flex-1 rounded border border-neutral-600 bg-neutral-900 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neutral-400"
            />
            <button
              onClick={() => newTeamName.trim() && updateName.mutate({ teamId: team.id, name: newTeamName.trim() })}
              disabled={!newTeamName.trim() || updateName.isLoading}
              className="rounded bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-40"
            >
              Save
            </button>
            <button onClick={() => setEditingName(false)} className="text-sm text-gray-400 hover:text-white">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white">{team.name}</span>
            {isLeader && (
              <button
                onClick={() => { setNewTeamName(team.name); setEditingName(true); }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Rename
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400">Members ({team.memberships.length})</p>
        {team.memberships.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 rounded border border-neutral-800 px-3 py-2">
            {m.user.image && (
              <img src={m.user.image} alt="" className="h-7 w-7 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{m.user.name ?? m.user.username ?? m.user.email}</p>
              {m.user.username && <p className="text-xs text-gray-500">@{m.user.username}</p>}
            </div>
            {m.userId === team.leaderId && (
              <span className="text-xs text-amber-500">Leader</span>
            )}
            {isLeader && m.userId !== team.leaderId && (
              <button
                onClick={() => removeMember.mutate({ teamId: team.id, userId: m.userId })}
                disabled={removeMember.isLoading}
                className="text-sm text-red-400 hover:text-red-300 disabled:opacity-40"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add member search */}
      {isLeader && (
        <div>
          <p className="mb-2 text-xs text-gray-400">Add a member</p>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or username..."
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          {searchResults && searchResults.length > 0 && (
            <div className="mt-1 rounded border border-neutral-700 bg-neutral-900">
              {searchResults
                .filter((u) => !team.memberships.some((m) => m.userId === u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => addMember.mutate({ teamId: team.id, userId: u.id })}
                    disabled={addMember.isLoading}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <div>
                      <p className="text-white">{u.name ?? u.username}</p>
                      {u.username && <p className="text-xs text-gray-500">@{u.username}</p>}
                    </div>
                  </button>
                ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults?.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamEditor;
