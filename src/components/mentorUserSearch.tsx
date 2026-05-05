import { api } from "@/trpc/api";
import { useState, useEffect } from "react";
import { inputStyles } from "@/ui/input";
import { Plus } from "@/ui/icons";
import clsx from "clsx";

interface MentorUserSearchProps {
  hackathonId: string;
  onUserSelect: (user: { id: string; name: string; email: string }) => void;
  disabled?: boolean;
}

const MentorUserSearch = ({ hackathonId, onUserSelect, disabled }: MentorUserSearchProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data: users, isLoading } = api.mentor.searchUsers.useQuery(
    { query, hackathonId },
    { enabled: query.length >= 2 },
  );

  useEffect(() => { setOpen(query.length >= 2 && !isLoading); }, [query, isLoading]);

  const handleSelect = (user: { id: string; name: string | null; email: string | null }) => {
    onUserSelect({ id: user.id, name: user.name || "Unknown", email: user.email || "" });
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users by name or email..."
        className={clsx(inputStyles, "w-full")}
        disabled={disabled}
      />
      {open && users && users.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 shadow-lg">
          <div className="max-h-60 overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} onClick={() => handleSelect(u)} className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-neutral-700">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">{u.name || "Unknown"}</div>
                  <div className="truncate text-sm text-gray-400">{u.email}</div>
                </div>
                <Plus width={16} className="ml-2 flex-shrink-0 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}
      {open && users && users.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 shadow-lg">
          <div className="text-sm text-gray-400">No users found</div>
        </div>
      )}
      {query.length >= 2 && isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 shadow-lg">
          <div className="text-sm text-gray-400">Searching...</div>
        </div>
      )}
    </div>
  );
};

export default MentorUserSearch;
