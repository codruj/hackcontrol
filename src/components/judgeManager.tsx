import { api } from "@/trpc/api";
import { useState } from "react";
import { Button } from "@/ui";
import { Plus, Cancel } from "@/ui/icons";
import UserSearch from "./userSearch";
import { toast } from "sonner";

interface JudgeManagerProps {
  hackathonId: string;
}

const JudgeManager = ({ hackathonId }: JudgeManagerProps) => {
  const [isAddingJudge, setIsAddingJudge] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null);
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);

  const { data: judges, isLoading, refetch } = api.judge.getHackathonJudges.useQuery({ hackathonId });
  const { data: categories } = api.category.getCategories.useQuery({ hackathonId });

  const hasCategories = (categories?.length ?? 0) > 0;

  const addJudgeMutation = api.judge.addJudge.useMutation({
    onSuccess: (newJudge) => {
      refetch();
      toast.success(`${newJudge.user.name} added as judge`);
      setIsAddingJudge(false);
      setSelectedCategoryIds([]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add judge");
    },
  });

  const removeJudgeMutation = api.judge.removeJudge.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Judge removed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove judge");
    },
  });

  const setCategoriesMutation = api.judge.setJudgeCategories.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Judge categories updated");
      setEditingJudgeId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update categories");
    },
  });

  const handleAddJudge = (user: { id: string; name: string; email: string }) => {
    addJudgeMutation.mutate({
      hackathonId,
      userId: user.id,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    });
  };

  const handleRemoveJudge = (userId: string) => {
    if (confirm("Are you sure you want to remove this judge?")) {
      removeJudgeMutation.mutate({ hackathonId, userId });
    }
  };

  const startEditCategories = (judgeId: string, currentCategoryIds: string[]) => {
    setEditingJudgeId(judgeId);
    setEditCategoryIds(currentCategoryIds);
  };

  const handleSaveCategories = (judgeId: string) => {
    setCategoriesMutation.mutate({ judgeId, hackathonId, categoryIds: editCategoryIds });
  };

  const toggleCategory = (categoryId: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(categoryId) ? list.filter((id) => id !== categoryId) : [...list, categoryId]);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-800 p-6">
        <h3 className="mb-4 text-lg font-semibold">Judge Management</h3>
        <div className="text-gray-400">Loading judges...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Judge Management</h3>
        {!isAddingJudge && (
          <Button icon={<Plus width={16} />} onClick={() => setIsAddingJudge(true)}>
            Add Judge
          </Button>
        )}
      </div>

      {/* Add judge form */}
      {isAddingJudge && (
        <div className="mb-6 rounded-lg border border-neutral-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Invite New Judge</h4>
            <Button
              icon={<Cancel width={16} />}
              onClick={() => { setIsAddingJudge(false); setSelectedCategoryIds([]); }}
              disabled={addJudgeMutation.isLoading}
            >
              Cancel
            </Button>
          </div>
          <UserSearch
            hackathonId={hackathonId}
            onUserSelect={handleAddJudge}
            disabled={addJudgeMutation.isLoading}
          />
          {hasCategories && (
            <div>
              <p className="mb-2 text-sm text-neutral-400">
                Assign to categories (leave empty for all categories):
              </p>
              <div className="flex flex-wrap gap-2">
                {categories!.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id, selectedCategoryIds, setSelectedCategoryIds)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      selectedCategoryIds.includes(cat.id)
                        ? "border-blue-500 bg-blue-600/20 text-blue-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              {selectedCategoryIds.length === 0 && (
                <p className="mt-1 text-xs text-neutral-500">All categories (global judge)</p>
              )}
            </div>
          )}
          {addJudgeMutation.isLoading && (
            <div className="text-sm text-gray-400">Adding judge...</div>
          )}
        </div>
      )}

      {/* Current judges list */}
      {judges && judges.length > 0 ? (
        <div>
          <h4 className="mb-3 font-medium text-gray-300">Current Judges ({judges.length})</h4>
          <div className="space-y-3">
            {judges.map((judge) => {
              const assignedCategories = judge.judgeCategories ?? [];
              const isEditing = editingJudgeId === judge.id;
              return (
                <div
                  key={judge.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border border-neutral-700 p-3 space-y-3 sm:space-y-0 sm:gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{judge.user.name}</div>
                    <div className="text-sm text-gray-400 truncate">{judge.user.email}</div>
                    {judge.inviter && (
                      <div className="mt-1">
                        <span className="inline-block rounded-full bg-blue-600/20 px-2 py-1 text-xs text-blue-400">
                          Invited by {judge.inviter.name}
                        </span>
                      </div>
                    )}
                    {hasCategories && (
                      <div className="mt-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-400">Categories (empty = all):</p>
                            <div className="flex flex-wrap gap-1">
                              {categories!.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => toggleCategory(cat.id, editCategoryIds, setEditCategoryIds)}
                                  className={`rounded-full px-2 py-0.5 text-xs border transition-colors ${
                                    editCategoryIds.includes(cat.id)
                                      ? "border-blue-500 bg-blue-600/20 text-blue-300"
                                      : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-500"
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              ))}
                            </div>
                            {editCategoryIds.length === 0 && (
                              <p className="text-xs text-neutral-500">Global (all categories)</p>
                            )}
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSaveCategories(judge.id)}
                                disabled={setCategoriesMutation.isLoading}
                                loadingstatus={setCategoriesMutation.isLoading}
                              >
                                Save
                              </Button>
                              <Button onClick={() => setEditingJudgeId(null)} disabled={setCategoriesMutation.isLoading}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {assignedCategories.length === 0 ? (
                              <span className="text-xs text-neutral-500">All categories</span>
                            ) : (
                              assignedCategories.map((jc) => (
                                <span
                                  key={jc.category.id}
                                  className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300 border border-neutral-700"
                                >
                                  {jc.category.name}
                                </span>
                              ))
                            )}
                            <button
                              onClick={() => startEditCategories(judge.id, assignedCategories.map((jc) => jc.category.id))}
                              className="text-xs text-blue-400 hover:text-blue-300 ml-1"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      icon={<Cancel width={16} />}
                      onClick={() => handleRemoveJudge(judge.userId)}
                      disabled={removeJudgeMutation.isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400">No judges assigned yet</div>
          <div className="mt-2 text-sm text-gray-500">
            Add judges to help review submissions for this hackathon
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgeManager;
