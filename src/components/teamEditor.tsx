import { useState } from "react";
import { api } from "@/trpc/api";
import { toast } from "sonner";

type TeamMember = { name: string; email: string; role: string };

interface TeamEditorProps {
  participationId: string;
  initialTeamName?: string | null;
  initialMembers?: { name: string; email: string; role?: string }[];
  readOnly?: boolean;
  onSaved?: () => void;
}

const TeamEditor = ({ participationId, initialTeamName, initialMembers, readOnly, onSaved }: TeamEditorProps) => {
  const [teamName, setTeamName] = useState(initialTeamName ?? "");
  const [members, setMembers] = useState<TeamMember[]>(
    initialMembers?.map((m) => ({ name: m.name, email: m.email, role: m.role ?? "" })) ?? [],
  );
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");

  const updateTeam = api.participation.updateTeamMembers.useMutation({
    onSuccess: () => {
      toast.success("Team updated");
      onSaved?.();
    },
    onError: (err) => toast.error(err.message),
  });

  function addMember() {
    if (!newName.trim()) return;
    setMembers((prev) => [...prev, { name: newName.trim(), email: newEmail.trim(), role: newRole.trim() }]);
    setNewName("");
    setNewEmail("");
    setNewRole("");
  }

  function removeMember(i: number) {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    updateTeam.mutate({ participationId, teamName: teamName || undefined, members });
  }

  if (readOnly) {
    return (
      <div className="space-y-2">
        {teamName && (
          <p className="text-sm text-gray-400">
            Team: <span className="font-medium text-white">{teamName}</span>
          </p>
        )}
        {members.length > 0 ? (
          members.map((m, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-neutral-800 px-3 py-2 text-sm">
              <span className="font-medium text-white">{m.name}</span>
              {m.email && <span className="text-gray-500">{m.email}</span>}
              {m.role && <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">{m.role}</span>}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No team members added.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-gray-400">Team name (optional)</label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team name"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
        />
      </div>

      {members.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Members</p>
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-3 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm">
              <span className="flex-1 text-white">{m.name}</span>
              {m.email && <span className="text-gray-500">{m.email}</span>}
              {m.role && <span className="text-xs text-neutral-400">{m.role}</span>}
              <button onClick={() => removeMember(i)} className="text-red-400 hover:text-red-300">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded border border-neutral-700 bg-neutral-900 p-4">
        <p className="mb-3 text-xs text-gray-400">Add a member</p>
        <div className="space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name *"
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          <input
            type="text"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMember()}
            placeholder="Role (e.g. Frontend, Design)"
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          <button
            onClick={addMember}
            disabled={!newName.trim()}
            className="rounded bg-neutral-700 px-4 py-2 text-sm text-white hover:bg-neutral-600 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={updateTeam.isLoading}
          className="rounded bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          {updateTeam.isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default TeamEditor;
