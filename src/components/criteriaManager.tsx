import { api } from "@/trpc/api";
import { Button, Alert } from "@/ui";
import { inputStyles } from "@/ui/input";
import { useState } from "react";
import { toast } from "sonner";

interface CriterionRow {
  name: string;
  weight: number;
}

interface CriteriaManagerProps {
  hackathonId: string;
}

const CriteriaManager = ({ hackathonId }: CriteriaManagerProps) => {
  const { data: existing, isLoading } = api.criteria.getCriteria.useQuery({ hackathonId });

  const [rows, setRows] = useState<CriterionRow[] | null>(null);

  const utils = api.useContext();

  const { mutate: save, isLoading: isSaving } = api.criteria.setCriteria.useMutation({
    onSuccess: () => {
      toast.success("Criteriile au fost salvate");
      setRows(null);
      utils.criteria.getCriteria.invalidate({ hackathonId });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: clear, isLoading: isClearing } = api.criteria.clearCriteria.useMutation({
    onSuccess: () => {
      toast.success("Criteriile au fost șterse");
      setRows(null);
      utils.criteria.getCriteria.invalidate({ hackathonId });
    },
    onError: (err) => toast.error(err.message),
  });

  // Work on a local copy; fall back to saved data
  const activeRows: CriterionRow[] =
    rows ??
    (existing && existing.length > 0
      ? existing.map((c) => ({ name: c.name, weight: c.weight }))
      : [{ name: "", weight: 100 }]);

  const totalWeight = activeRows.reduce((s, r) => s + (r.weight || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) <= 0.5;
  const allNamed = activeRows.every((r) => r.name.trim().length > 0);
  const canSave = weightOk && allNamed && activeRows.length > 0;

  const update = (i: number, field: keyof CriterionRow, value: string | number) =>
    setRows(activeRows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const add = () => {
    if (activeRows.length >= 7) return;
    const remaining = Math.max(0, 100 - totalWeight);
    setRows([...activeRows, { name: "", weight: Math.round(remaining * 10) / 10 }]);
  };

  const remove = (i: number) => setRows(activeRows.filter((_, idx) => idx !== i));

  const handleSave = () => {
    save({
      hackathonId,
      criteria: activeRows.map((r, i) => ({
        name: r.name.trim(),
        weight: r.weight,
        order: i + 1,
      })),
    });
  };

  if (isLoading) return <p className="text-sm text-neutral-500">Se încarcă...</p>;

  return (
    <div className="space-y-3">
      {/* Rows */}
      {activeRows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={row.name}
            onChange={(e) => update(i, "name", e.target.value)}
            placeholder={`Criteriu ${i + 1}`}
            className={`${inputStyles} flex-1`}
          />
          <input
            type="number"
            value={row.weight}
            onChange={(e) => update(i, "weight", parseFloat(e.target.value) || 0)}
            min={0.1}
            max={100}
            step={0.1}
            className={`${inputStyles} w-24 text-right`}
          />
          <span className="text-sm text-neutral-400 w-4">%</span>
          <button
            onClick={() => remove(i)}
            disabled={activeRows.length === 1}
            className="text-neutral-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Weight indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex-1 h-1.5 rounded-full bg-neutral-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${weightOk ? "bg-green-500" : totalWeight > 100 ? "bg-red-500" : "bg-yellow-500"}`}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}
          />
        </div>
        <span className={`font-mono text-xs ${weightOk ? "text-green-400" : "text-yellow-400"}`}>
          {totalWeight.toFixed(1)}% / 100%
        </span>
      </div>

      {!weightOk && activeRows.length > 0 && (
        <Alert>Suma ponderilor trebuie să fie exact 100%</Alert>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {activeRows.length < 7 && (
          <button onClick={add} className="text-sm text-blue-400 hover:text-blue-300">
            + Adaugă criteriu
          </button>
        )}
        <div className="flex-1" />
        {existing && existing.length > 0 && !rows && (
          <Button onClick={() => clear({ hackathonId })} disabled={isClearing}>
            {isClearing ? "Se șterge..." : "Șterge criteriile"}
          </Button>
        )}
        <Button onClick={handleSave} disabled={!canSave || isSaving} loadingstatus={isSaving}>
          {isSaving ? "Se salvează..." : "Salvează criteriile"}
        </Button>
      </div>
    </div>
  );
};

export default CriteriaManager;
