import { api } from "@/trpc/api";
import { KeyAltPlus } from "@/ui/icons";
import { Modal, Button } from "@/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputStyles } from "@/ui/input";
import { toast } from "sonner";

const EnterKey = () => {
  const router = useRouter();
  const [key, setKey] = useState("");

  const enrollMutation = api.hackathon.enrollInHackathon.useMutation({
    onSuccess: (data) => {
      toast.success(`You joined ${data.name}!`);
      router.push(`/app/${data.url}`);
    },
    onError: (e) => {
      toast.error(e.message || "Hackathon not found. Check the key and try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    enrollMutation.mutate({ url: trimmed });
  };

  return (
    <Modal
      btn={<Button icon={<KeyAltPlus width={18} />}>Register for hackathon</Button>}
      title="Join a hackathon"
      description="Enter the hackathon key provided by the organizer"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="key" className="mb-1 block text-sm text-neutral-300">
            Hackathon key
          </label>
          <input
            id="key"
            className={inputStyles}
            placeholder="Enter the hackathon key..."
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={enrollMutation.isLoading}
          />
          <p className="mt-2 text-xs text-neutral-500">
            After joining you can chat, book mentors, and submit your project from inside the hackathon.
          </p>
        </div>
        <div className="flex flex-row-reverse">
          <Button
            type="submit"
            disabled={!key.trim() || enrollMutation.isLoading}
            loadingstatus={enrollMutation.isLoading}
          >
            {enrollMutation.isLoading ? "Joining..." : "Join hackathon"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EnterKey;
