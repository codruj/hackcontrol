import { api } from "@/trpc/api";
import { Button } from "@/ui";
import { ArrowRight } from "@/ui/icons";
import Link from "next/link";

// Separate component to handle individual judge assignment
const JudgeAssignmentCard = ({ assignment }: { assignment: any }) => {
  // Fetch scoring progress for each hackathon - hooks are now at component level
  const { data: scores } = api.scoring.getJudgeScores.useQuery(
    { hackathonId: assignment.hackathon.id },
    { enabled: !assignment.hackathon.is_finished }
  );
  
  const { data: participations } = api.participation.participationByHackathonId.useQuery(
    { hackathonUrl: assignment.hackathon.url },
    { enabled: !assignment.hackathon.is_finished }
  );

  const scoredCount = scores ? new Set(scores.map(s => s.participation.id)).size : 0;
  const totalCount = participations?.length || 0;
  const progressPercentage = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0;

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-700 p-4">
      <div className="flex-1">
        <h3 className="font-medium text-white">
          {assignment.hackathon.name}
        </h3>
        <p className="text-sm text-gray-400">
          {assignment.hackathon.description}
        </p>
        <div className="mt-2 flex items-center space-x-2">
          {assignment.hackathon.is_finished ? (
            <span className="rounded-full bg-yellow-600/20 px-2 py-1 text-xs text-yellow-400">
              Finished
            </span>
          ) : (
            <>
              <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-400">
                Active
              </span>
              {totalCount > 0 && (
                <span className="text-xs text-gray-400">
                  Scored: {scoredCount}/{totalCount} ({progressPercentage}%)
                </span>
              )}
            </>
          )}
        </div>
        
        {/* Progress bar for active hackathons */}
        {!assignment.hackathon.is_finished && totalCount > 0 && (
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>
      
      <div className="ml-4">
        <Link href={`/app/${assignment.hackathon.url}`}>
          <Button 
            icon={<ArrowRight width={16} />}
          >
            Judge
          </Button>
        </Link>
      </div>
    </div>
  );
};

const JudgesDashboard = () => {
  const { data: judgedHackathons, isLoading } = api.judge.getJudgedHackathons.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-800 p-6">
        <h2 className="mb-4 text-lg font-semibold">Judge Assignments</h2>
        <div className="text-gray-400">Loading your judge assignments...</div>
      </div>
    );
  }

  if (!judgedHackathons || judgedHackathons.length === 0) {
    return null; // Don't show anything if user is not a judge
  }

  return (
    <div className="rounded-lg border border-neutral-800 p-6">
      <h2 className="mb-4 text-lg font-semibold">Judge Assignments</h2>
      <div className="space-y-3">
        {judgedHackathons.map((assignment) => (
          <JudgeAssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </div>
  );
};

export default JudgesDashboard;