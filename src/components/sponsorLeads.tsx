import { useState } from "react";
import { api } from "@/trpc/api";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const SponsorLeads = () => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = api.sponsor.getSponsorRegistrations.useQuery(undefined, {
    enabled: open,
  });

  const deleteMutation = api.sponsor.deleteSponsorRegistration.useMutation({
    onSuccess: () => {
      void refetch();
      toast.success("Sponsor registration deleted");
    },
    onError: (e) => toast.error(e.message || "Failed to delete"),
  });

  return (
    <div className="rounded-lg border border-neutral-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">In need of sponsors?</h3>
          <p className="mt-0.5 text-sm text-neutral-400">
            Companies that registered interest in sponsoring UTCN hackathons
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-neutral-700 bg-neutral-800/30 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-800/60"
        >
          {open ? "Hide" : "View leads"}
        </button>
      </div>

      {open && (
        <div className="mt-5">
          {isLoading ? (
            <p className="text-sm text-neutral-400">Loading...</p>
          ) : !data || data.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-700 p-6 text-center">
              <p className="text-sm text-neutral-400">No sponsor registrations yet.</p>
              <p className="mt-1 text-xs text-neutral-500">
                Companies that click "Register here" on the public page will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-lg border border-neutral-700 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-white">{reg.companyName}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-neutral-500">
                        {new Date(reg.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (confirm("Delete this sponsor registration?")) {
                              deleteMutation.mutate({ id: reg.id });
                            }
                          }}
                          disabled={deleteMutation.isLoading}
                          className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-400">{reg.contact}</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{reg.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SponsorLeads;
