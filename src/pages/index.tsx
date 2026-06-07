import { useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";

import { api } from "@/trpc/api";
import { ExternalLink, Link, Input } from "@/ui";
import { ArrowRight, Github, Cancel } from "@/ui/icons";
import { Button, ButtonStyles } from "@/ui/button";
import { inputStyles } from "@/ui/input";
import Up from "@/animations/up";
import clsx from "clsx";

function SponsorInterestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const mutation = api.sponsor.submitSponsorInterest.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message || "Something went wrong"),
  });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!companyName.trim()) next.companyName = "Company name is required";
    if (!contact.trim()) next.contact = "Email or phone is required";
    if (!description.trim()) next.description = "Description is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({ companyName, contact, description });
  };

  const handleClose = () => {
    setCompanyName("");
    setContact("");
    setDescription("");
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-midnight bg-opacity-70 backdrop-blur-sm data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] overflow-auto rounded-lg border border-neutral-800 bg-midnight p-6 shadow-xl focus:outline-none data-[state=open]:animate-contentShow">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-xl font-medium">
              {submitted ? "Request received" : "Register as a sponsor"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button onClick={handleClose} className="text-neutral-400 hover:text-white transition-colors">
                <Cancel width={22} />
              </button>
            </Dialog.Close>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <p className="text-gray-300">
                Thank you! We've received your interest and will be in touch soon.
              </p>
              <div className="flex justify-end">
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300">
                  Company name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  maxLength={200}
                  className={inputStyles}
                  disabled={mutation.isLoading}
                />
                {errors.companyName && (
                  <p className="mt-1 text-xs text-red-400">{errors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300">
                  Email or phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="contact@acme.com or +40 700 000 000"
                  maxLength={200}
                  className={inputStyles}
                  disabled={mutation.isLoading}
                />
                {errors.contact && (
                  <p className="mt-1 text-xs text-red-400">{errors.contact}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300">
                  How would you like to sponsor? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us how you'd like to support UTCN hackathons — prizes, mentorship, workshops, etc."
                  maxLength={2000}
                  rows={4}
                  className={inputStyles}
                  disabled={mutation.isLoading}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-400">{errors.description}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" onClick={handleClose} disabled={mutation.isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isLoading} loadingstatus={mutation.isLoading}>
                  Submit
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function Home() {
  const [hackathonSearch, setHackathonSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: recentHackathons, isLoading } = api.hackathon.getRecentHackathons.useQuery();
  const { data: sponsors = [] } = api.sponsor.getPublicSponsors.useQuery();
  const { data: allPhotos = [] } = api.gallery.getAllPhotos.useQuery();

  const previewPhotos = allPhotos.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center space-y-5 px-4 py-14 sm:py-20">
        <Up>
          <Image
            className="relative z-20"
            src="/images/phck_logo.svg"
            width={64}
            height={64}
            alt="Phck logo"
          />
        </Up>
        <h1 className="text-center text-2xl sm:text-left md:mt-4 md:text-3xl">
          An open source hackathon management
        </h1>
        <div className="flex items-center space-x-2">
          <ExternalLink
            href="https://github.com/airi-utcn/hackcontrol"
            className={ButtonStyles}
          >
            <div className="flex items-center space-x-2">
              <Github width={16} />
              <span>Repository</span>
            </div>
          </ExternalLink>
          <Link href="auth" underline={false} className={clsx(ButtonStyles)}>
            <div className="flex items-center space-x-2">
              <span>Get Started</span>
              <ArrowRight width={16} />
            </div>
          </Link>
        </div>

        {/* Sponsors & Partners card */}
        <div className="mb-2 mt-4 w-full max-w-sm">
          <div className="rounded-md border border-neutral-800 bg-midnight p-5">
            <h3 className="mb-3 text-xl font-medium">🤝 Sponsors &amp; Partners</h3>
            {sponsors.length > 0 ? (
              <ul
                className="max-h-44 space-y-1.5 overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin" }}
              >
                {sponsors.map((name) => (
                  <li
                    key={name}
                    className="rounded border border-neutral-800 px-2 py-1 text-sm text-neutral-300"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500 italic">No sponsors listed yet.</p>
            )}
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="text-sm text-neutral-400">
              Interested in sponsoring UTCN hackathons?
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className={clsx(ButtonStyles, "text-sm")}
            >
              Register here
            </button>
          </div>
        </div>
      </div>

      {/* Gallery preview */}
      {previewPhotos.length > 0 && (
        <div className="mx-auto mb-8 w-full max-w-sm px-4">
          <h3 className="mb-3 text-xl font-medium">Photos</h3>
          <div className="grid grid-cols-2 gap-2">
            {previewPhotos.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
              >
                <img
                  src={photo.url}
                  alt={photo.hackathon.name}
                  className="h-28 w-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center">
            <NextLink
              href="/gallery"
              className={clsx(ButtonStyles, "text-sm")}
            >
              View gallery
            </NextLink>
          </div>
        </div>
      )}

      {/* Hackathons listing */}
      <div className="mx-auto w-full max-w-6xl px-6 pb-16">
        <h1 className="mb-4 text-2xl font-medium">Hackathons</h1>
        {isLoading ? (
          <p className="text-gray-400">Loading hackathons...</p>
        ) : recentHackathons && recentHackathons.length > 0 ? (
          <>
            <Input
              value={hackathonSearch}
              placeholder="Search hackathons..."
              onChange={(e) => setHackathonSearch(e.target.value)}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentHackathons
                .filter(
                  (h) =>
                    h.name.toLowerCase().includes(hackathonSearch.toLowerCase()) ||
                    h.description?.toLowerCase().includes(hackathonSearch.toLowerCase()),
                )
                .sort((a, b) => {
                  if (a.is_finished !== b.is_finished) return a.is_finished ? 1 : -1;
                  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                })
                .map((hackathon) => (
                  <NextLink
                    key={hackathon.id}
                    href={`/hackathon/${hackathon.url}`}
                    className="block"
                  >
                    <div className="group relative h-full w-full cursor-pointer rounded-md bg-white bg-opacity-10 p-4 transition-all hover:bg-opacity-20">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{hackathon.name}</h3>
                        {hackathon.is_finished ? (
                          <span className="rounded bg-neutral-600 px-2 py-0.5 text-xs">
                            Finished
                          </span>
                        ) : (
                          <span className="rounded bg-green-600 px-2 py-0.5 text-xs">
                            Ongoing
                          </span>
                        )}
                      </div>
                      {hackathon.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                          {hackathon.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(hackathon.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </NextLink>
                ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 p-8">
            <p className="text-center text-neutral-300">No hackathons available yet.</p>
          </div>
        )}
      </div>

      <SponsorInterestModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
