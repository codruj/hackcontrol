import { api } from "@/trpc/api";
import { Button } from "@/ui";
import { ArrowRight } from "@/ui/icons";
import Link from "next/link";

const MentorsDashboard = () => {
  const { data, isLoading } = api.mentor.getMentoredHackathons.useQuery();

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="my-6 rounded-lg border border-neutral-800 p-6">
      <h2 className="mb-4 text-lg font-semibold">Mentor Assignments</h2>
      <div className="space-y-3">
        {(data as Array<{ id: string; hackathon: { name: string; url: string; description: string | null; is_finished: boolean } }>).map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-neutral-700 p-4">
            <div className="flex-1">
              <h3 className="font-medium text-white">{m.hackathon.name}</h3>
              {m.hackathon.description && <p className="text-sm text-gray-400">{m.hackathon.description}</p>}
              <div className="mt-2">
                {m.hackathon.is_finished ? (
                  <span className="rounded-full bg-yellow-600/20 px-2 py-1 text-xs text-yellow-400">Finished</span>
                ) : (
                  <span className="rounded-full bg-amber-600/20 px-2 py-1 text-xs text-amber-400">Active</span>
                )}
              </div>
            </div>
            <div className="ml-4">
              <Link href={`/mentors/${m.hackathon.url}`}>
                <Button icon={<ArrowRight width={16} />}>Manage Availability</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MentorsDashboard;
