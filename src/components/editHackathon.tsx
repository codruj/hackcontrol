import { api } from "@/trpc/api";
import type { THackathon } from "@/types/hackathon.type";
import { useState } from "react";
import { useRouter } from "next/router";
import { SubmitHandler, useForm } from "react-hook-form";
import { updateHackathon } from "@/schema/hackathon";

import { SaveFloppyDisk, Settings } from "@/ui/icons";
import { Modal, Button, Alert } from "@/ui";
import { inputStyles } from "@/ui/input";
import DeleteHackathon from "./deleteHackathon";
import { toast } from "sonner";
import FinishHackathon from "./finishHackathon";
import JudgeManager from "./judgeManager";
import CriteriaManager from "./criteriaManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import clsx from "clsx";

interface EditHackathonProps extends updateHackathon {
  key: string;
  url: string;
}

const EditHackathon = (props: EditHackathonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>();

  // Timeline is a dynamic list, managed outside react-hook-form
  const [timelineSteps, setTimelineSteps] = useState<string[]>(() => {
    if (props.timeline && Array.isArray(props.timeline)) {
      return props.timeline as string[];
    }
    return [];
  });

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<THackathon>({
    defaultValues: {
      name: props.name,
      description: props.description,
      rules: props.rules,
      criteria: props.criteria,
      prizes: props.prizes,
      matchmaking: props.matchmaking,
      categories: props.categories,
      organizers: props.organizers,
    },
  });

  const { mutate } = api.hackathon.editHackathon.useMutation({
    onSuccess: () => {
      setLoading(false);
      router.reload();
    },
    onError: () => {
      setLoading(false);
    },
  });

  const onSubmit: SubmitHandler<THackathon> = (data) => {
    try {
      setLoading(true);
      mutate({
        ...data,
        id: props.id,
        is_finished: false,
        timeline: timelineSteps.filter((s) => s.trim().length > 0),
      });
      toast.success("Hackathon updated successfully");
    } catch (err) {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  const saveTimeline = () => {
    try {
      setLoading(true);
      const formValues = getValues();
      mutate({
        id: props.id,
        name: formValues.name || props.name,
        description: formValues.description || props.description,
        rules: formValues.rules,
        criteria: formValues.criteria,
        prizes: formValues.prizes,
        matchmaking: formValues.matchmaking,
        categories: formValues.categories,
        organizers: formValues.organizers,
        is_finished: props.is_finished,
        timeline: timelineSteps.filter((s) => s.trim().length > 0),
      });
      toast.success("Timeline saved");
    } catch (err) {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  const addStep = () => {
    if (timelineSteps.length >= 10) return;
    setTimelineSteps([...timelineSteps, ""]);
  };

  const updateStep = (i: number, value: string) => {
    setTimelineSteps(timelineSteps.map((s, idx) => (idx === i ? value : s)));
  };

  const removeStep = (i: number) => {
    setTimelineSteps(timelineSteps.filter((_, idx) => idx !== i));
  };

  return (
    <Modal
      btn={<Button icon={<Settings width={18} />}>Settings</Button>}
      title="Settings"
      wide
    >
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-2 w-full grid grid-cols-4 md:grid-cols-8 h-auto gap-1 p-1">
          <TabsTrigger value="info" className="text-xs px-2 py-2">General</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs px-2 py-2">Rules</TabsTrigger>
          <TabsTrigger value="details" className="text-xs px-2 py-2">Details</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs px-2 py-2">Timeline</TabsTrigger>
          <TabsTrigger value="criteria" className="text-xs px-2 py-2">Criteria</TabsTrigger>
          <TabsTrigger value="judges" className="text-xs px-2 py-2">Judges</TabsTrigger>
          <TabsTrigger value="finish" className="text-xs px-2 py-2">Finish</TabsTrigger>
          <TabsTrigger value="delete" className="text-xs px-2 py-2">Delete</TabsTrigger>
        </TabsList>

        {/* General tab */}
        <TabsContent value="info">
          <form className="mb-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label htmlFor="name">Title:</label>
              <input
                id="name"
                defaultValue={props.name}
                className={inputStyles}
                placeholder="Hackathon name (max 25 characters)"
                autoComplete="off"
                disabled={loading}
                {...register("name", {
                  required: "Hackathon name is required",
                  maxLength: {
                    value: 25,
                    message: "Hackathon name must be less than 25 characters",
                  },
                })}
              />
              {errors.name && <Alert>{errors.name?.message}</Alert>}
            </div>
            <div className="mb-6">
              <label htmlFor="description">Description:</label>
              <textarea
                id="description"
                defaultValue={props.description}
                className={inputStyles}
                placeholder="Description (max 200 characters)"
                autoComplete="off"
                disabled={loading}
                {...register("description", {
                  maxLength: {
                    value: 200,
                    message: "Description must be less than 200 characters",
                  },
                })}
              />
              {errors.description && (
                <Alert>{errors.description?.message}</Alert>
              )}
            </div>
            <div className="mb-6">
              <label htmlFor="url">Key:</label>
              <input
                id="url"
                defaultValue={props.url}
                className={clsx(inputStyles, "cursor-not-allowed")}
                autoComplete="off"
                disabled={true}
              />
            </div>
            <div className="flex flex-row-reverse">
              <Button
                type="submit"
                disabled={loading}
                loadingstatus={loading}
                icon={<SaveFloppyDisk width={17} />}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Rules tab */}
        <TabsContent value="rules">
          <form className="mb-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label htmlFor="rules">Hackathon Rules:</label>
              <textarea
                id="rules"
                defaultValue={props.rules || ""}
                className={inputStyles}
                placeholder="Enter hackathon rules (max 2000 characters)"
                rows={6}
                autoComplete="off"
                disabled={loading}
                {...register("rules", {
                  maxLength: {
                    value: 2000,
                    message: "Rules must be less than 2000 characters",
                  },
                })}
              />
              {errors.rules && <Alert>{errors.rules?.message}</Alert>}
            </div>
            <div className="mb-6">
              <label htmlFor="criteria">Judging Criteria:</label>
              <textarea
                id="criteria"
                defaultValue={props.criteria || ""}
                className={inputStyles}
                placeholder="Enter judging criteria (max 2000 characters)"
                rows={6}
                autoComplete="off"
                disabled={loading}
                {...register("criteria", {
                  maxLength: {
                    value: 2000,
                    message: "Criteria must be less than 2000 characters",
                  },
                })}
              />
              {errors.criteria && <Alert>{errors.criteria?.message}</Alert>}
            </div>
            <div className="flex flex-row-reverse">
              <Button
                type="submit"
                disabled={loading}
                loadingstatus={loading}
                icon={<SaveFloppyDisk width={17} />}
              >
                {loading ? "Saving..." : "Save Rules & Criteria"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Details tab — prizes, matchmaking, categories, organizers */}
        <TabsContent value="details">
          <form className="mb-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label htmlFor="prizes">Prizes:</label>
              <textarea
                id="prizes"
                defaultValue={props.prizes || ""}
                className={inputStyles}
                placeholder="Describe the prizes for winners (max 2000 characters)"
                rows={4}
                autoComplete="off"
                disabled={loading}
                {...register("prizes", {
                  maxLength: {
                    value: 2000,
                    message: "Prizes must be less than 2000 characters",
                  },
                })}
              />
              {errors.prizes && <Alert>{errors.prizes?.message}</Alert>}
            </div>
            <div className="mb-6">
              <label htmlFor="categories">Categories:</label>
              <textarea
                id="categories"
                defaultValue={props.categories || ""}
                className={inputStyles}
                placeholder="Hackathon categories or tracks (max 500 characters)"
                rows={3}
                autoComplete="off"
                disabled={loading}
                {...register("categories", {
                  maxLength: {
                    value: 500,
                    message: "Categories must be less than 500 characters",
                  },
                })}
              />
              {errors.categories && <Alert>{errors.categories?.message}</Alert>}
            </div>
            <div className="mb-6">
              <label htmlFor="organizers">Organizers:</label>
              <textarea
                id="organizers"
                defaultValue={props.organizers || ""}
                className={inputStyles}
                placeholder="Organizer names or organizations (max 500 characters)"
                rows={3}
                autoComplete="off"
                disabled={loading}
                {...register("organizers", {
                  maxLength: {
                    value: 500,
                    message: "Organizers must be less than 500 characters",
                  },
                })}
              />
              {errors.organizers && <Alert>{errors.organizers?.message}</Alert>}
            </div>
            <div className="mb-6">
              <label htmlFor="matchmaking">Matchmaking / Team Formation:</label>
              <textarea
                id="matchmaking"
                defaultValue={props.matchmaking || ""}
                className={inputStyles}
                placeholder="Team formation rules or matchmaking info (max 2000 characters)"
                rows={4}
                autoComplete="off"
                disabled={loading}
                {...register("matchmaking", {
                  maxLength: {
                    value: 2000,
                    message: "Matchmaking must be less than 2000 characters",
                  },
                })}
              />
              {errors.matchmaking && <Alert>{errors.matchmaking?.message}</Alert>}
            </div>
            <div className="flex flex-row-reverse">
              <Button
                type="submit"
                disabled={loading}
                loadingstatus={loading}
                icon={<SaveFloppyDisk width={17} />}
              >
                {loading ? "Saving..." : "Save Details"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Timeline tab */}
        <TabsContent value="timeline">
          <div className="mb-3 space-y-3">
            <p className="text-sm text-neutral-400">
              Add up to 10 timeline steps. Each step describes a phase or milestone of the hackathon.
            </p>

            {timelineSteps.length === 0 && (
              <p className="text-sm italic text-neutral-500">No steps added yet.</p>
            )}

            {timelineSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Step ${i + 1} description`}
                    className={inputStyles}
                    disabled={loading}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-neutral-500 hover:text-red-400 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {timelineSteps.length < 10 && (
                <button
                  type="button"
                  onClick={addStep}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add step
                </button>
              )}
              <div className="flex-1" />
              <Button
                onClick={saveTimeline}
                disabled={loading}
                loadingstatus={loading}
                icon={<SaveFloppyDisk width={17} />}
              >
                {loading ? "Saving..." : "Save Timeline"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="criteria">
          <CriteriaManager hackathonId={props.id} />
        </TabsContent>
        <TabsContent value="judges">
          <JudgeManager hackathonId={props.id} />
        </TabsContent>
        <TabsContent value="finish">
          <FinishHackathon url={props.url} is_finished={props.is_finished} />
        </TabsContent>
        <TabsContent value="delete">
          <DeleteHackathon id={props.id} />
        </TabsContent>
      </Tabs>
    </Modal>
  );
};

export default EditHackathon;
