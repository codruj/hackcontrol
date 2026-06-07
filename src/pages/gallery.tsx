import { useState } from "react";
import NextLink from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { api } from "@/trpc/api";
import { ArrowLeft, Cancel } from "@/ui/icons";
import clsx from "clsx";

export default function GalleryPage() {
  const [filter, setFilter] = useState<string>("all");
  const [preview, setPreview] = useState<string | null>(null);

  const { data: photos = [], isLoading } = api.gallery.getAllPhotos.useQuery();

  const hackathons = Array.from(
    new Map(photos.map((p) => [p.hackathon.id, p.hackathon])).values()
  );

  const filtered =
    filter === "all" ? photos : photos.filter((p) => p.hackathon.id === filter);

  return (
    <div className="min-h-screen px-4 pb-16 pt-16 sm:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <NextLink
            href="/"
            className="text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft width={18} />
          </NextLink>
          <h1 className="text-2xl font-medium">Gallery</h1>
        </div>

        {hackathons.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={clsx(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                filter === "all"
                  ? "border-neutral-500 bg-neutral-800 text-white"
                  : "border-neutral-800 text-neutral-400 hover:text-neutral-300"
              )}
            >
              All hackathons
            </button>
            {hackathons.map((h) => (
              <button
                key={h.id}
                onClick={() => setFilter(h.id)}
                className={clsx(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  filter === h.id
                    ? "border-neutral-500 bg-neutral-800 text-white"
                    : "border-neutral-800 text-neutral-400 hover:text-neutral-300"
                )}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-neutral-400">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 p-10 text-center">
            <p className="text-neutral-400">No photos yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((photo) => (
              <div
                key={photo.id}
                className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
                onClick={() => setPreview(photo.url)}
              >
                <img
                  src={photo.url}
                  alt={photo.hackathon.name}
                  className="h-48 w-full object-cover transition-opacity group-hover:opacity-75"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-xs text-white">{photo.hackathon.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog.Root
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" />
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
