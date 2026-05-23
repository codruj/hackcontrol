import { useState } from "react";
import { api } from "@/trpc/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Modal, Button, Alert } from "@/ui";
import { inputStyles } from "@/ui/input";
import { Plus, Settings, Cancel } from "@/ui/icons";
import Loading from "./loading";

interface AnnouncementManagerProps {
  hackathonId: string;
  hackathonUrl: string;
}

interface AnnouncementFormData {
  title: string;
  content: string;
  important: boolean;
}

const AnnouncementManager = ({ hackathonId, hackathonUrl }: AnnouncementManagerProps) => {
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch announcements
  const { data: announcements, isLoading, refetch } = api.announcement.getByHackathonUrl.useQuery({
    url: hackathonUrl,
  });

  // Create announcement mutation
  const { mutate: createAnnouncement } = api.announcement.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Announcement created successfully");
      setLoading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create announcement");
      setLoading(false);
    },
  });

  // Update announcement mutation
  const { mutate: updateAnnouncement } = api.announcement.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Announcement updated successfully");
      setEditingAnnouncement(null);
      setLoading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update announcement");
      setLoading(false);
    },
  });

  // Delete announcement mutation
  const { mutate: deleteAnnouncement } = api.announcement.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Announcement deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete announcement");
    },
  });

  if (isLoading) {
    return <Loading text="Loading announcements..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Announcements</h3>
        <CreateAnnouncementModal
          hackathonId={hackathonId}
          onCreate={createAnnouncement}
          loading={loading}
          setLoading={setLoading}
        />
      </div>

      {announcements && announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`rounded-lg border p-4 ${
                announcement.important
                  ? "border-yellow-600/50 bg-yellow-900/10"
                  : "border-neutral-800 bg-neutral-900/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">
                      {announcement.title}
                    </h4>
                    {announcement.important && (
                      <span className="rounded-full bg-yellow-600 px-2 py-0.5 text-xs font-medium text-white">
                        IMPORTANT
                      </span>
                    )}
                  </div>
                  {editingAnnouncement === announcement.id ? (
                    <EditAnnouncementForm
                      announcement={announcement}
                      onUpdate={updateAnnouncement}
                      onCancel={() => setEditingAnnouncement(null)}
                      loading={loading}
                      setLoading={setLoading}
                    />
                  ) : (
                    <>
                      <p className="mt-2 whitespace-pre-wrap text-gray-400">
                        {announcement.content}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Posted: {new Date(announcement.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </>
                  )}
                </div>
                {editingAnnouncement !== announcement.id && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingAnnouncement(announcement.id)}
                      icon={<Settings width={16} />}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this announcement?")) {
                          deleteAnnouncement({ id: announcement.id });
                        }
                      }}
                      icon={<Cancel width={16} />}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 text-center">
          <p className="text-gray-400">No announcements yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Create announcements to keep participants informed
          </p>
        </div>
      )}
    </div>
  );
};

// Create Announcement Modal
const CreateAnnouncementModal = ({
  hackathonId,
  onCreate,
  loading,
  setLoading,
}: {
  hackathonId: string;
  onCreate: any;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnnouncementFormData>();

  const onSubmit: SubmitHandler<AnnouncementFormData> = (data) => {
    setLoading(true);
    onCreate({
      hackathonId,
      title: data.title,
      content: data.content,
      important: data.important || false,
    });
    reset();
  };

  return (
    <Modal
      btn={
        <Button icon={<Plus width={18} />} disabled={loading}>
          New Announcement
        </Button>
      }
      title="Create Announcement"
      description="Post a new announcement for hackathon participants"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="title">Title:</label>
          <input
            id="title"
            className={inputStyles}
            placeholder="Announcement title (max 100 characters)"
            autoComplete="off"
            disabled={loading}
            {...register("title", {
              required: "Title is required",
              maxLength: {
                value: 100,
                message: "Title must be less than 100 characters",
              },
            })}
          />
          {errors.title && <Alert>{errors.title?.message}</Alert>}
        </div>

        <div>
          <label htmlFor="content">Content:</label>
          <textarea
            id="content"
            className={inputStyles}
            placeholder="Announcement content"
            rows={6}
            autoComplete="off"
            disabled={loading}
            {...register("content", {
              required: "Content is required",
            })}
          />
          {errors.content && <Alert>{errors.content?.message}</Alert>}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="important"
            disabled={loading}
            {...register("important")}
            className="rounded border-neutral-800 bg-midnight text-yellow-600 focus:ring-yellow-600"
          />
          <label htmlFor="important" className="text-sm">
            Mark as important (will be highlighted)
          </label>
        </div>

        <div className="flex flex-row-reverse">
          <Button type="submit" disabled={loading} loadingstatus={loading}>
            {loading ? "Creating..." : "Create Announcement"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Announcement Form (inline)
const EditAnnouncementForm = ({
  announcement,
  onUpdate,
  onCancel,
  loading,
  setLoading,
}: {
  announcement: any;
  onUpdate: any;
  onCancel: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementFormData>({
    defaultValues: {
      title: announcement.title,
      content: announcement.content,
      important: announcement.important,
    },
  });

  const onSubmit: SubmitHandler<AnnouncementFormData> = (data) => {
    setLoading(true);
    onUpdate({
      id: announcement.id,
      title: data.title,
      content: data.content,
      important: data.important,
    });
  };

  return (
    <form className="mt-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          className={inputStyles}
          placeholder="Title"
          disabled={loading}
          {...register("title", {
            required: "Title is required",
            maxLength: {
              value: 100,
              message: "Title must be less than 100 characters",
            },
          })}
        />
        {errors.title && <Alert>{errors.title?.message}</Alert>}
      </div>

      <div>
        <textarea
          className={inputStyles}
          placeholder="Content"
          rows={4}
          disabled={loading}
          {...register("content", {
            required: "Content is required",
          })}
        />
        {errors.content && <Alert>{errors.content?.message}</Alert>}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={`important-${announcement.id}`}
          disabled={loading}
          {...register("important")}
          className="rounded border-neutral-800 bg-midnight text-yellow-600 focus:ring-yellow-600"
        />
        <label htmlFor={`important-${announcement.id}`} className="text-sm">
          Mark as important
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} loadingstatus={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default AnnouncementManager;
