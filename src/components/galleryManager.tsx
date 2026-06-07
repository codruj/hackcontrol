import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { api } from "@/trpc/api";
import { Button } from "@/ui/button";
import { Cancel } from "@/ui/icons";
import { toast } from "sonner";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export default function GalleryManager({ hackathonId }: { hackathonId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: photos = [], refetch } = api.gallery.getHackathonPhotos.useQuery({ hackathonId });

  const addPhoto = api.gallery.addPhoto.useMutation({
    onSuccess: () => {
      void refetch();
      toast.success("Photo uploaded");
    },
    onError: (e) => toast.error(e.message || "Failed to save photo"),
  });

  const deletePhoto = api.gallery.deletePhoto.useMutation({
    onSuccess: () => {
      void refetch();
      toast.success("Photo deleted");
    },
    onError: (e) => toast.error(e.message || "Failed to delete photo"),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      toast.error("Only images are accepted (JPG, PNG, GIF, WEBP)");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File size must be under 8 MB");
      return;
    }

    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/upload/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, hackathonId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await res.json() as { url: string };
      addPhoto.mutate({ hackathonId, url });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-neutral-400">
          Upload photos for this hackathon. Accepted: JPG, PNG, GIF, WEBP · Max 8 MB each.
        </p>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || addPhoto.isLoading}
          loadingstatus={uploading}
        >
          {uploading ? "Uploading..." : "Upload photo"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {photos.length === 0 ? (
        <p className="text-sm italic text-neutral-500">No photos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
            >
              <img
                src={photo.url}
                alt=""
                className="h-32 w-full cursor-pointer object-cover transition-opacity group-hover:opacity-75"
                onClick={() => setPreview(photo.url)}
              />
              <button
                onClick={() =>
                  deletePhoto.mutate({ hackathonId, photoId: photo.id })
                }
                disabled={deletePhoto.isLoading}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 focus:outline-none">
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt=""
                  className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                />
                <Dialog.Close asChild>
                  <button className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                    <Cancel width={18} />
                  </button>
                </Dialog.Close>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
