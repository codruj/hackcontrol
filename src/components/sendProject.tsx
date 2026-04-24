import { useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { api } from "@/trpc/api";
import type { TParticipation } from "@/types/participation.type";

import { inputStyles } from "@/ui/input";
import { Alert, Button, Tip } from "@/ui";
import confetti from "canvas-confetti";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface iSendProject {
  id: string;
  url: string;
  name: string;
  description?: string;
  is_finished: boolean;
  categories?: Category[];
}

const SendProject = (hackathonProps: iSendProject) => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<TParticipation>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "team_members.members",
  });

  const [loading, setLoading] = useState(false);
  const [isTeamSubmission, setIsTeamSubmission] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const router = useRouter();

  const hasCategories = (hackathonProps.categories?.length ?? 0) > 0;

  const { mutate } = api.participation.createParticipation.useMutation({
    onSuccess: () => {
      router.push(`/app`);
      setLoading(false);
      confetti({
        particleCount: 100,
        startVelocity: 30,
        spread: 100,
      });
    },
    onError: () => {
      setLoading(false);
    },
  });

  const onSubmit: SubmitHandler<TParticipation> = (data) => {
    if (hasCategories && !selectedCategoryId) {
      toast.error("Please select a category");
      return;
    }
    try {
      setLoading(true);
      const submissionData = {
        title: data.title,
        description: data.description,
        project_url: data.project_url,
        hackathon_url: hackathonProps.url,
        hackathon_name: hackathonProps.name,
        ...(hasCategories && selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        ...(isTeamSubmission && data.team_members && data.team_members.members.length > 0 && {
          team_members: data.team_members,
        }),
      };
      mutate(submissionData);
      toast.success("Your project has been successfully submitted");
    } catch (err) {
      setLoading(false);
      toast.error("Something went wrong");
    }
  };

  const addTeamMember = () => {
    append({ name: "", email: "", role: "" });
  };

  const removeTeamMember = (index: number) => {
    remove(index);
  };

  return (
    <>
      {!hackathonProps.is_finished ? (
        <form
          className="flex w-120 flex-col space-y-4 rounded-md border border-neutral-800 p-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="border-b border-neutral-800 pb-3">
            <h1 className="text-2xl font-medium">{hackathonProps.name}</h1>
            {hackathonProps.description && (
              <p className="text-gray-400">{hackathonProps.description}</p>
            )}
          </div>

          {/* Category selection */}
          {hasCategories && (
            <div className="mt-4">
              <label htmlFor="category">
                Category: <span className="text-red-400">*</span>
              </label>
              <select
                id="category"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className={inputStyles}
              >
                <option value="">Select a category...</option>
                {hackathonProps.categories!.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                    {cat.description ? ` — ${cat.description}` : ""}
                  </option>
                ))}
              </select>
              {hasCategories && !selectedCategoryId && (
                <p className="mt-1 text-xs text-neutral-500">Category is required for this hackathon</p>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isTeamSubmission}
                onChange={(e) => setIsTeamSubmission(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-900"
              />
              <span>Submit as a team</span>
            </label>
          </div>
          <div className="mt-4">
            <label htmlFor="title">Title:</label>
            <input
              id="title"
              placeholder="Title (max. 50 characters)"
              type="text"
              className={inputStyles}
              {...register("title", {
                required: "Title is required",
                maxLength: {
                  value: 50,
                  message: "Title must be less than 50 characters",
                },
              })}
            />
            {errors.title && <Alert>{errors.title?.message}</Alert>}
          </div>
          <div className="mt-4">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              placeholder="Description (max. 300 characters)"
              className={inputStyles}
              {...register("description", {
                required: "Description is required",
                maxLength: {
                  value: 300,
                  message: "Description must be less than 300 characters",
                },
              })}
            />
            {errors.description && <Alert>{errors.description?.message}</Alert>}
          </div>
          <div className="mt-4">
            <label htmlFor="project_url">Url:</label>
            <input
              id="project_url"
              className={inputStyles}
              placeholder="https://"
              {...register("project_url", {
                required: "URL is required",
                pattern: {
                  value: /^(http|https):\/\/[^ "]+$/,
                  message: "The url must start with http:// or https://",
                },
              })}
            />
            {errors.project_url && <Alert>{errors.project_url?.message}</Alert>}
          </div>
          {isTeamSubmission && (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="team_name">Team Name (optional):</label>
                <input
                  id="team_name"
                  className={inputStyles}
                  placeholder="Enter team name"
                  {...register("team_members.team_name")}
                />
              </div>
              <div>
                <label>Team Members:</label>
                {fields.length === 0 && (
                  <p className="text-sm text-gray-400 mb-2">Add team members below</p>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="border border-neutral-700 rounded p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Member {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeTeamMember(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        placeholder="Full name"
                        className={inputStyles}
                        {...register(`team_members.members.${index}.name`, {
                          required: "Name is required",
                        })}
                      />
                      {errors.team_members?.members?.[index]?.name && (
                        <Alert>{errors.team_members.members[index]?.name?.message}</Alert>
                      )}
                      <input
                        placeholder="Email address"
                        type="email"
                        className={inputStyles}
                        {...register(`team_members.members.${index}.email`, {
                          required: "Email is required",
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: "Invalid email address",
                          },
                        })}
                      />
                      {errors.team_members?.members?.[index]?.email && (
                        <Alert>{errors.team_members.members[index]?.email?.message}</Alert>
                      )}
                      <input
                        placeholder="Role (optional)"
                        className={inputStyles}
                        {...register(`team_members.members.${index}.role`)}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="w-full border border-neutral-700 border-dashed rounded p-2 text-gray-400 hover:text-white hover:border-neutral-600 transition-colors"
                >
                  + Add Team Member
                </button>
                {isTeamSubmission && fields.length === 0 && (
                  <Alert>Please add at least one team member</Alert>
                )}
              </div>
            </div>
          )}
          <Button type="submit" loadingstatus={loading}>
            {loading ? "Submitting..." : "Submit Project"}
          </Button>
          <Tip>You can only submit 1 project per hackathon.</Tip>
        </form>
      ) : (
        <div className="flex w-120 flex-col space-y-4 rounded-md border border-neutral-800 p-5">
          <div className="border-b border-neutral-800 pb-3">
            <h1 className="text-2xl font-medium">{hackathonProps.name}</h1>
            {hackathonProps.description && (
              <p className="text-gray-400">{hackathonProps.description}</p>
            )}
          </div>
          <p className="text-gray-400">
            This hackathon is finished. You can no longer submit projects.
          </p>
        </div>
      )}
    </>
  );
};

export default SendProject;
