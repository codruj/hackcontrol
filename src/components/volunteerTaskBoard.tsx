import { api } from "@/trpc/api";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/ui";
import { Plus, Cancel, SaveFloppyDisk, Settings } from "@/ui/icons";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import * as Dialog from "@radix-ui/react-dialog";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Volunteer {
  id: string;
  userId: string;
  user: { id: string; name: string | null; email: string | null };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  status: TaskStatus;
  hackathonId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  assignees: {
    taskId: string;
    volunteerId: string;
    volunteer: Volunteer;
  }[];
  createdBy: { id: string; name: string | null };
}

interface TaskFormValues {
  title: string;
  description: string;
  deadline: string;
  status: TaskStatus;
  volunteerIds: string[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "bg-neutral-700 text-neutral-200",
  IN_PROGRESS: "bg-blue-600/20 text-blue-300 border border-blue-600/30",
  DONE: "bg-green-600/20 text-green-300 border border-green-600/30",
};

const COLUMN_HEADER_COLORS: Record<TaskStatus, string> = {
  TODO: "border-neutral-600",
  IN_PROGRESS: "border-blue-600/50",
  DONE: "border-green-600/50",
};

function DeadlineBadge({ deadline }: { deadline: Date | null }) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const cls =
    diffDays < 0
      ? "text-red-400"
      : diffDays <= 3
        ? "text-yellow-400"
        : "text-neutral-400";
  return <span className={`text-xs ${cls}`}>⏱ {label}</span>;
}

interface TaskCardInnerProps {
  task: Task;
  isOrganizer: boolean;
  canUpdateStatus: boolean;
  hackathonId: string;
  onEdit?: (task: Task) => void;
  onDeleteConfirm?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  isDragging?: boolean;
}

function TaskCardInner({
  task,
  isOrganizer,
  canUpdateStatus,
  hackathonId,
  onEdit,
  onDeleteConfirm,
  onStatusChange,
  isDragging,
}: TaskCardInnerProps) {
  return (
    <div
      className={`rounded-lg border border-neutral-700 bg-neutral-900 p-3 transition-shadow ${
        isDragging ? "shadow-2xl ring-2 ring-blue-500/50" : "hover:border-neutral-600"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-white">{task.title}</p>
        {isOrganizer && (
          <div className="flex flex-shrink-0 gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              title="Edit task"
            >
              <Settings width={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteConfirm?.(task.id); }}
              className="rounded p-1 text-neutral-400 hover:bg-red-900/40 hover:text-red-400"
              title="Delete task"
            >
              <Cancel width={13} />
            </button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-neutral-400">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <DeadlineBadge deadline={task.deadline} />
        {task.assignees.map((a) => (
          <span
            key={a.volunteerId}
            className="rounded-full bg-purple-600/20 px-2 py-0.5 text-xs text-purple-300"
          >
            {a.volunteer.user.name || a.volunteer.user.email || "?"}
          </span>
        ))}
      </div>

      {canUpdateStatus && (
        <div className="mt-2.5 border-t border-neutral-700/60 pt-2">
          <select
            value={task.status}
            onChange={(e) => onStatusChange?.(task.id, e.target.value as TaskStatus)}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-white focus:border-neutral-500 focus:outline-none"
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
      )}
    </div>
  );
}

interface DraggableTaskCardProps extends TaskCardInnerProps {
  isDraggable: boolean;
}

function DraggableTaskCard({ isDraggable, ...props }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.task.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : "auto",
    position: isDragging ? ("relative" as const) : ("static" as const),
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative">
        {isDraggable && (
          <div
            {...listeners}
            {...attributes}
            className="absolute -left-1 top-0 bottom-0 flex cursor-grab items-center px-1 text-neutral-600 hover:text-neutral-400 active:cursor-grabbing"
            title="Drag to change status"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="8" cy="2" r="1.5" />
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="2" cy="14" r="1.5" />
              <circle cx="8" cy="14" r="1.5" />
            </svg>
          </div>
        )}
        <div className={isDraggable ? "ml-3" : ""}>
          <TaskCardInner {...props} isDragging={isDragging} />
        </div>
      </div>
    </div>
  );
}

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  isOrganizer: boolean;
  currentVolunteerId: string | null;
  hackathonId: string;
  onEdit: (task: Task) => void;
  onDeleteConfirm: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

function TaskColumn({
  status,
  tasks,
  isOrganizer,
  currentVolunteerId,
  hackathonId,
  onEdit,
  onDeleteConfirm,
  onStatusChange,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border ${COLUMN_HEADER_COLORS[status]} transition-colors ${
        isOver ? "bg-neutral-800/60" : "bg-neutral-900/30"
      }`}
    >
      <div className="flex items-center justify-between border-b border-neutral-700/50 px-4 py-3">
        <span className="text-sm font-semibold text-neutral-200">{STATUS_LABELS[status]}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
          {tasks.length}
        </span>
      </div>

      <div className="min-h-[120px] space-y-2 p-3">
        {tasks.map((task) => {
          const isAssignedToCurrentUser = currentVolunteerId
            ? task.assignees.some((a) => a.volunteerId === currentVolunteerId)
            : false;
          const canUpdateStatus = isOrganizer || isAssignedToCurrentUser;

          return (
            <DraggableTaskCard
              key={task.id}
              task={task}
              isDraggable={isOrganizer}
              isOrganizer={isOrganizer}
              canUpdateStatus={canUpdateStatus}
              hackathonId={hackathonId}
              onEdit={onEdit}
              onDeleteConfirm={onDeleteConfirm}
              onStatusChange={onStatusChange}
            />
          );
        })}

        {tasks.length === 0 && (
          <div className="flex h-20 items-center justify-center">
            <span className="text-xs text-neutral-600">Drop tasks here</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskFormProps {
  hackathonId: string;
  volunteers: Volunteer[];
  task?: Task | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function TaskForm({ hackathonId, volunteers, task, onSuccess, onCancel }: TaskFormProps) {
  const isEdit = !!task;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<TaskFormValues>({
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      deadline: task?.deadline ? new Date(task.deadline).toISOString().split("T")[0] : "",
      status: task?.status ?? "TODO",
      volunteerIds: task?.assignees.map((a) => a.volunteerId) ?? [],
    },
  });

  const selectedIds = watch("volunteerIds");

  const createMutation = api.volunteer.createTask.useMutation({
    onSuccess: () => { toast.success("Task created"); onSuccess(); },
    onError: (e) => toast.error(e.message || "Failed to create task"),
  });

  const updateMutation = api.volunteer.updateTask.useMutation({
    onSuccess: () => { toast.success("Task updated"); onSuccess(); },
    onError: (e) => toast.error(e.message || "Failed to update task"),
  });

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  const onSubmit = (data: TaskFormValues) => {
    const deadline = data.deadline ? new Date(data.deadline) : undefined;
    const volunteerIds = data.volunteerIds;

    if (isEdit) {
      updateMutation.mutate({
        taskId: task!.id,
        hackathonId,
        title: data.title,
        description: data.description || null,
        deadline: deadline ?? null,
        status: data.status,
        volunteerIds,
      });
    } else {
      createMutation.mutate({
        hackathonId,
        title: data.title,
        description: data.description || undefined,
        deadline,
        status: data.status,
        volunteerIds,
      });
    }
  };

  const toggleVolunteer = (volunteerId: string) => {
    const next = selectedIds.includes(volunteerId)
      ? selectedIds.filter((id) => id !== volunteerId)
      : [...selectedIds, volunteerId];
    setValue("volunteerIds", next);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">Title *</label>
        <input
          {...register("title", { required: "Title is required" })}
          className="focus:ring-primary-500 block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white placeholder-neutral-400 focus:border-transparent focus:rounded focus:outline outline-neutral-600 outline-1"
          placeholder="Task title"
        />
        {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">Description</label>
        <textarea
          {...register("description")}
          rows={3}
          className="focus:ring-primary-500 block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white placeholder-neutral-400 focus:border-transparent focus:rounded focus:outline outline-neutral-600 outline-1 resize-none"
          placeholder="Optional task description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">Deadline</label>
          <input
            type="date"
            {...register("deadline")}
            className="focus:ring-primary-500 block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white focus:border-transparent focus:rounded focus:outline outline-neutral-600 outline-1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">Status</label>
          <select
            {...register("status")}
            className="block w-full rounded-lg border border-neutral-800 bg-midnight px-3 py-2 text-white focus:border-neutral-600 focus:outline-none"
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
      </div>

      {volunteers.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            Assign volunteers
          </label>
          <div className="flex flex-wrap gap-2">
            {volunteers.map((vol) => (
              <button
                key={vol.id}
                type="button"
                onClick={() => toggleVolunteer(vol.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedIds.includes(vol.id)
                    ? "border-purple-500 bg-purple-600/20 text-purple-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {vol.user.name || vol.user.email || "?"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel} type="button" disabled={isSaving}>
          Cancel
        </Button>
        <Button
          type="submit"
          icon={<SaveFloppyDisk width={16} />}
          loadingstatus={isSaving}
          disabled={isSaving}
        >
          {isEdit ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}

interface VolunteerTaskBoardProps {
  hackathonId: string;
  isOrganizer: boolean;
  currentUserId: string;
  volunteers: Volunteer[];
}

const VolunteerTaskBoard = ({
  hackathonId,
  isOrganizer,
  currentUserId,
  volunteers,
}: VolunteerTaskBoardProps) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const { data: tasks, isLoading, refetch } = api.volunteer.getTasks.useQuery({ hackathonId });

  const updateStatusMutation = api.volunteer.updateTaskStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message || "Failed to update status"),
  });

  const deleteMutation = api.volunteer.deleteTask.useMutation({
    onSuccess: () => { refetch(); toast.success("Task deleted"); },
    onError: (e) => toast.error(e.message || "Failed to delete task"),
  });

  const currentVolunteer = volunteers.find((v) => v.userId === currentUserId) ?? null;
  const currentVolunteerId = currentVolunteer?.id ?? null;

  const taskList: Task[] = (tasks as Task[]) ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = taskList.find((t: Task) => t.id === event.active.id);
    setActiveDragTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = taskList.find((t: Task) => t.id === taskId);

    if (task && task.status !== newStatus && ["TODO", "IN_PROGRESS", "DONE"].includes(newStatus)) {
      updateStatusMutation.mutate({ taskId, hackathonId, status: newStatus });
    }
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateStatusMutation.mutate({ taskId, hackathonId, status });
  };

  const handleDeleteConfirm = (taskId: string) => {
    if (confirm("Delete this task?")) {
      deleteMutation.mutate({ taskId, hackathonId });
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-neutral-400">Loading tasks...</div>
    );
  }

  const byStatus = (status: TaskStatus) => taskList.filter((t: Task) => t.status === status);

  const columnProps = {
    isOrganizer,
    currentVolunteerId,
    hackathonId,
    onEdit: setEditingTask,
    onDeleteConfirm: handleDeleteConfirm,
    onStatusChange: handleStatusChange,
  };

  return (
    <div>
      {isOrganizer && (
        <div className="mb-4 flex justify-end">
          <Button icon={<Plus width={16} />} onClick={() => setIsCreateOpen(true)}>
            Create Task
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TaskColumn status="TODO" tasks={byStatus("TODO")} {...columnProps} />
          <TaskColumn status="IN_PROGRESS" tasks={byStatus("IN_PROGRESS")} {...columnProps} />
          <TaskColumn status="DONE" tasks={byStatus("DONE")} {...columnProps} />
        </div>

        <DragOverlay>
          {activeDragTask && (
            <div className="rotate-1 opacity-95">
              <TaskCardInner
                task={activeDragTask}
                isOrganizer={false}
                canUpdateStatus={false}
                hackathonId={hackathonId}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create Task Dialog */}
      <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[90vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-neutral-800 bg-midnight p-6 shadow-2xl focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-xl font-medium">New Task</Dialog.Title>
              <Dialog.Close asChild>
                <Cancel width={22} className="cursor-pointer text-gray-400 transition-all hover:scale-105" />
              </Dialog.Close>
            </div>
            <TaskForm
              hackathonId={hackathonId}
              volunteers={volunteers}
              onSuccess={() => { setIsCreateOpen(false); refetch(); }}
              onCancel={() => setIsCreateOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Task Dialog */}
      <Dialog.Root open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[90vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-neutral-800 bg-midnight p-6 shadow-2xl focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-xl font-medium">Edit Task</Dialog.Title>
              <Dialog.Close asChild>
                <Cancel width={22} className="cursor-pointer text-gray-400 transition-all hover:scale-105" />
              </Dialog.Close>
            </div>
            {editingTask && (
              <TaskForm
                hackathonId={hackathonId}
                volunteers={volunteers}
                task={editingTask}
                onSuccess={() => { setEditingTask(null); refetch(); }}
                onCancel={() => setEditingTask(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default VolunteerTaskBoard;
