import { api } from "@/trpc/api";
import { nanoid } from "nanoid";
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<THackathon>();

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
      });
      toast.success("Hackathon created successfully");
    } catch (err) {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Modal
      btn={<Button icon={<Settings width={18} />}>Settings</Button>}
      title="Settings"
      wide
    >
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-2 w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 p-1">
          <TabsTrigger value="info" className="text-xs px-2 py-2">General</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs px-2 py-2">Rules</TabsTrigger>
          <TabsTrigger value="criteria" className="text-xs px-2 py-2">Criteria</TabsTrigger>
          <TabsTrigger value="judges" className="text-xs px-2 py-2">Judges</TabsTrigger>
          <TabsTrigger value="finish" className="text-xs px-2 py-2">Finish</TabsTrigger>
          <TabsTrigger value="delete" className="text-xs px-2 py-2">Delete</TabsTrigger>
        </TabsList>
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
                {loading ? "Playing Kukoro..." : "Save"}
              </Button>
            </div>
          </form>
        </TabsContent>
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
                {loading ? "Playing Kukoro..." : "Save Rules & Criteria"}
              </Button>
            </div>
          </form>
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
