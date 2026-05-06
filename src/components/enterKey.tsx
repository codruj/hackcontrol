import { api } from "@/trpc/api";
import { KeyAltPlus, Plus, Cancel } from "@/ui/icons";
import { Modal, Button } from "@/ui";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { inputStyles } from "@/ui/input";
import { toast } from "sonner";
import clsx from "clsx";

interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

function MemberSearch({
  selected,
  onAdd,
  disabled,
}: {
  selected: SelectedUser[];
  onAdd: (u: SelectedUser) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedIds = new Set(selected.map((u) => u.id));

  const { data: users, isLoading } = api.hackathon.searchUsersForTeam.useQuery(
    { query },
    { enabled: query.length >= 2 },
  );

  useEffect(() => { setOpen(query.length >= 2 && !isLoading); }, [query, isLoading]);

  const handlePick = (u: { id: string; name: string | null; email: string | null }) => {
    if (selectedIds.has(u.id)) return;
    onAdd({ id: u.id, name: u.name || "Unknown", email: u.email || "" });
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email..."
        className={clsx(inputStyles, "w-full")}
        disabled={disabled}
      />
      {open && users && users.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 shadow-lg">
          <div className="max-h-48 overflow-y-auto">
            {users
              .filter((u) => !selectedIds.has(u.id))
              .map((u) => (
                <div
                  key={u.id}
                  onClick={() => handlePick(u)}
                  className="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-neutral-700"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{u.name || "Unknown"}</p>
                    <p className="truncate text-xs text-gray-400">{u.email}</p>
                  </div>
                  <Plus width={14} className="ml-2 flex-shrink-0 text-gray-400" />
                </div>
              ))}
          </div>
        </div>
      )}
      {open && users && users.filter((u) => !selectedIds.has(u.id)).length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 shadow-lg text-sm text-gray-400">
          No users found
        </div>
      )}
    </div>
  );
}

const EnterKey = () => {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<SelectedUser[]>([]);

  const enrollMutation = api.hackathon.enrollInHackathon.useMutation({
    onSuccess: (data) => {
      toast.success(`You joined ${data.name}!`);
      router.push(`/app/${data.url}`);
    },
    onError: (e) => {
      toast.error(e.message || "Hackathon not found. Check the key and try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    enrollMutation.mutate({
      url: trimmedKey,
      teamName: teamName.trim() || undefined,
      memberIds: members.length > 0 ? members.map((m) => m.id) : undefined,
    });
  };

  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id));

  const hasTeam = teamName.trim().length > 0;

  return (
    <Modal
      btn={<Button icon={<KeyAltPlus width={18} />}>Register for hackathon</Button>}
      title="Join a hackathon"
      description="Enter the hackathon key provided by the organizer"
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">
            Hackathon key <span className="text-red-400">*</span>
          </label>
          <input
            className={inputStyles}
            placeholder="Enter the hackathon key..."
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={enrollMutation.isLoading}
          />
        </div>

        <div className="border-t border-neutral-800 pt-4">
          <p className="mb-3 text-sm font-medium text-neutral-300">
            Team registration <span className="text-neutral-500">(optional)</span>
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-400">Team name</label>
              <input
                className={inputStyles}
                placeholder="e.g. Code Crushers"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={enrollMutation.isLoading}
              />
            </div>

            {hasTeam && (
              <div>
                <label className="mb-1 block text-xs text-neutral-400">
                  Add team members (search by name or email)
                </label>
                <MemberSearch
                  selected={members}
                  onAdd={(u) => setMembers((prev) => [...prev, u])}
                  disabled={enrollMutation.isLoading}
                />
                {members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {members.map((m) => (
                      <span
                        key={m.id}
                        className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200"
                      >
                        {m.name}
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          className="text-neutral-500 hover:text-white"
                        >
                          <Cancel width={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-neutral-500">
                  All listed members will be enrolled and get access to your team's private channel.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-row-reverse">
          <Button
            type="submit"
            disabled={!key.trim() || enrollMutation.isLoading}
            loadingstatus={enrollMutation.isLoading}
          >
            {enrollMutation.isLoading ? "Joining..." : "Join hackathon"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EnterKey;
