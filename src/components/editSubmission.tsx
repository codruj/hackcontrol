import { useState } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { api } from "@/trpc/api";
import { inputStyles } from "@/ui/input";
import { Alert, Button } from "@/ui";

interface TeamMember {
  name: string;
  email: string;
  role?: string;
}

interface EditFormValues {
  title: string;
  description: string;
  project_url: string;
  presentation_url?: string;
  team_members?: {
    team_name?: string;
    members: TeamMember[];
  };
}

interface Submission {
  id: string;
  title: string;
  description: string;
  project_url: string;
  presentation_url?: string | null;
  team_members?: any;
}

interface EditSubmissionProps {
  submission: Submission;
  hackathonName: string;
  hackathonDescription?: string | null;
  isFinished: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}

const EditSubmission = ({
  submission,
  hackathonName,
  hackathonDescription,
  isFinished,
  onSaved,
  onDeleted,
}: EditSubmissionProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isTeamSubmission, setIsTeamSubmission] = useState(
    !!(submission.team_members?.members?.length),
  );

  const existingTeam = submission.team_members as
    | { team_name?: string; members: TeamMember[] }
    | null
    | undefined;

  const { register, handleSubmit, control, formState: { errors } } = useForm<EditFormValues>({
    defaultValues: {
      title: submission.title,
      description: submission.description,
      project_url: submission.project_url,
      presentation_url: submission.presentation_url ?? "",
      team_members: {
        team_name: existingTeam?.team_name ?? "",
        members: existingTeam?.members ?? [],
      },
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "team_members.members" });

  const editMutation = api.participation.editSubmission.useMutation({
    onSuccess: () => {
      toast.success("Submission updated");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = api.participation.deleteSubmission.useMutation({
    onSuccess: () => {
      toast.success("Submission deleted");
      onDeleted();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit: SubmitHandler<EditFormValues> = (data) => {
    editMutation.mutate({
      id: submission.id,
      title: data.title,
      description: data.description,
      project_url: data.project_url,
      presentation_url: data.presentation_url || undefined,
      team_members:
        isTeamSubmission && (data.team_members?.members?.length ?? 0) > 0
          ? data.team_members
          : undefined,
    });
  };

  if (isFinished) {
    return (
      <div className="w-full max-w-lg rounded-md border border-neutral-800 p-5">
        <div className="border-b border-neutral-800 pb-3">
          <h1 className="text-2xl font-medium">{hackathonName}</h1>
          {hackathonDescription && <p className="text-gray-400">{hackathonDescription}</p>}
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-neutral-400">
            Submissions can no longer be edited because the hackathon has ended.
          </p>
          <div className="rounded border border-neutral-800 p-4 space-y-2">
            <p className="font-medium text-white">{submission.title}</p>
            <p className="text-sm text-gray-400">{submission.description}</p>
            <a href={submission.project_url} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-400 hover:underline">
              {submission.project_url}
            </a>
            {submission.presentation_url && (
              <a href={submission.presentation_url} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-400 hover:underline">
                {submission.presentation_url}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col space-y-4 rounded-md border border-neutral-800 p-5"
      >
        <div className="border-b border-neutral-800 pb-3">
          <h1 className="text-2xl font-medium">{hackathonName}</h1>
          {hackathonDescription && <p className="text-gray-400">{hackathonDescription}</p>}
        </div>

        <div>
          <label htmlFor="edit-title">Title:</label>
          <input
            id="edit-title"
            type="text"
            className={inputStyles}
            placeholder="Title (max. 50 characters)"
            {...register("title", {
              required: "Title is required",
              maxLength: { value: 50, message: "Title must be less than 50 characters" },
            })}
          />
          {errors.title && <Alert>{errors.title.message}</Alert>}
        </div>

        <div>
          <label htmlFor="edit-description">Description:</label>
          <textarea
            id="edit-description"
            className={inputStyles}
            placeholder="Description (max. 300 characters)"
            {...register("description", {
              required: "Description is required",
              maxLength: { value: 300, message: "Description must be less than 300 characters" },
            })}
          />
          {errors.description && <Alert>{errors.description.message}</Alert>}
        </div>

        <div>
          <label htmlFor="edit-project-url">GitHub Repository:</label>
          <input
            id="edit-project-url"
            className={inputStyles}
            placeholder="https://github.com/..."
            {...register("project_url", {
              required: "GitHub repository URL is required",
              pattern: {
                value: /^(http|https):\/\/[^ "]+$/,
                message: "The URL must start with http:// or https://",
              },
            })}
          />
          {errors.project_url && <Alert>{errors.project_url.message}</Alert>}
        </div>

        <div>
          <label htmlFor="edit-presentation-url">Presentation (optional):</label>
          <input
            id="edit-presentation-url"
            className={inputStyles}
            placeholder="https://"
            {...register("presentation_url", {
              pattern: {
                value: /^(http|https):\/\/[^ "]+$|^$/,
                message: "The URL must start with http:// or https://",
              },
            })}
          />
          {errors.presentation_url && <Alert>{errors.presentation_url.message}</Alert>}
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isTeamSubmission}
              onChange={(e) => setIsTeamSubmission(e.target.checked)}
              className="rounded border-neutral-800 bg-neutral-900"
            />
            <span>Team submission</span>
          </label>
        </div>

        {isTeamSubmission && (
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-team-name">Team Name (optional):</label>
              <input
                id="edit-team-name"
                className={inputStyles}
                placeholder="Enter team name"
                {...register("team_members.team_name")}
              />
            </div>
            <div>
              <label>Team Members:</label>
              {fields.map((field, index) => (
                <div key={field.id} className="mb-3 rounded border border-neutral-700 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Member {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      placeholder="Full name"
                      className={inputStyles}
                      {...register(`team_members.members.${index}.name`, { required: "Name is required" })}
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
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
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
                onClick={() => append({ name: "", email: "", role: "" })}
                className="w-full rounded border border-dashed border-neutral-700 p-2 text-gray-400 transition-colors hover:border-neutral-600 hover:text-white"
              >
                + Add Team Member
              </button>
            </div>
          </div>
        )}

        <Button type="submit" loadingstatus={editMutation.isLoading}>
          {editMutation.isLoading ? "Saving..." : "Save changes"}
        </Button>
      </form>

      {/* Delete section */}
      {!confirmDelete ? (
        <div className="rounded-md border border-red-900/40 bg-red-950/20 p-4">
          <p className="mb-3 text-sm text-gray-400">
            Need to withdraw your submission? This action cannot be undone.
          </p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded border border-red-700 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
          >
            Delete submission
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-red-700 bg-red-950/30 p-4">
          <p className="mb-3 text-sm font-medium text-white">
            Are you sure you want to delete this submission? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteMutation.mutate({ id: submission.id })}
              disabled={deleteMutation.isLoading}
              className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleteMutation.isLoading ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded border border-neutral-700 px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditSubmission;
