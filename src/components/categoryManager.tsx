import { api } from "@/trpc/api";
import { Button, Alert } from "@/ui";
import { inputStyles } from "@/ui/input";
import { useState } from "react";
import { toast } from "sonner";

interface CategoryManagerProps {
  hackathonId: string;
}

const CategoryManager = ({ hackathonId }: CategoryManagerProps) => {
  const { data: categories, isLoading, refetch } = api.category.getCategories.useQuery({ hackathonId });

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const utils = api.useContext();

  const invalidate = () => utils.category.getCategories.invalidate({ hackathonId });

  const { mutate: addCategory, isLoading: isAdding } = api.category.addCategory.useMutation({
    onSuccess: () => {
      toast.success("Category added");
      setAdding(false);
      setNewName("");
      setNewDesc("");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: updateCategory, isLoading: isUpdating } = api.category.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      setEditingId(null);
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteCategory, isLoading: isDeleting } = api.category.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const startEdit = (cat: { id: string; name: string; description: string | null }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description ?? "");
    setAdding(false);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCategory({ hackathonId, name: newName.trim(), description: newDesc.trim() || undefined });
  };

  const handleUpdate = (categoryId: string) => {
    if (!editName.trim()) return;
    updateCategory({ categoryId, hackathonId, name: editName.trim(), description: editDesc.trim() || undefined });
  };

  const handleDelete = (categoryId: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Submissions assigned to it will lose their category.`)) return;
    deleteCategory({ categoryId, hackathonId });
  };

  if (isLoading) return <p className="text-sm text-neutral-500">Loading...</p>;

  const atLimit = (categories?.length ?? 0) >= 10;

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-400">
        Add up to 10 categories. Teams will choose a category when submitting their project.
        Judges can be assigned globally or per category.
      </p>

      {/* Existing categories */}
      {categories && categories.length > 0 ? (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-neutral-700 p-3">
              {editingId === cat.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Category name"
                    className={inputStyles}
                    maxLength={100}
                  />
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className={inputStyles}
                    maxLength={500}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdate(cat.id)}
                      disabled={!editName.trim() || isUpdating}
                      loadingstatus={isUpdating}
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={() => setEditingId(null)} disabled={isUpdating}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{cat.name}</p>
                    {cat.description && (
                      <p className="text-sm text-neutral-400 mt-0.5 truncate">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(cat)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={isDeleting}
                      className="text-sm text-neutral-500 hover:text-red-400 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-neutral-500">No categories yet.</p>
      )}

      {/* Add form */}
      {adding ? (
        <div className="rounded-lg border border-neutral-700 p-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name (required, max 100)"
            className={inputStyles}
            maxLength={100}
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional, max 500)"
            className={inputStyles}
            maxLength={500}
          />
          {!newName.trim() && <Alert>Name is required</Alert>}
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || isAdding}
              loadingstatus={isAdding}
            >
              {isAdding ? "Adding..." : "Add"}
            </Button>
            <Button onClick={() => { setAdding(false); setNewName(""); setNewDesc(""); }} disabled={isAdding}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        !atLimit && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            + Add category
          </button>
        )
      )}

      {atLimit && !adding && (
        <p className="text-sm text-neutral-500">Maximum of 10 categories reached.</p>
      )}
    </div>
  );
};

export default CategoryManager;
