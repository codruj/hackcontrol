import { api } from "@/trpc/api";
import { Button } from "@/ui";
import { ArrowRight } from "@/ui/icons";
import Link from "next/link";

const VolunteersDashboard = () => {
  const { data: volunteeredHackathons, isLoading } =
    api.volunteer.getVolunteeredHackathons.useQuery();

  if (isLoading || !volunteeredHackathons || volunteeredHackathons.length === 0) {
    return null;
  }

  return (
    <div className="my-6 rounded-lg border border-neutral-800 p-6">
      <h2 className="mb-4 text-lg font-semibold">Volunteer Assignments</h2>
      <div className="space-y-3">
        {(volunteeredHackathons as Array<{ id: string; hackathon: { name: string; url: string; description: string | null; is_finished: boolean } }>).map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center justify-between rounded-lg border border-neutral-700 p-4"
          >
            <div className="flex-1">
              <h3 className="font-medium text-white">{assignment.hackathon.name}</h3>
              {assignment.hackathon.description && (
                <p className="text-sm text-gray-400">{assignment.hackathon.description}</p>
              )}
              <div className="mt-2">
                {assignment.hackathon.is_finished ? (
                  <span className="rounded-full bg-yellow-600/20 px-2 py-1 text-xs text-yellow-400">
                    Finished
                  </span>
                ) : (
                  <span className="rounded-full bg-purple-600/20 px-2 py-1 text-xs text-purple-400">
                    Active
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4">
              <Link href={`/volunteers/${assignment.hackathon.url}`}>
                <Button icon={<ArrowRight width={16} />}>View Tasks</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VolunteersDashboard;
