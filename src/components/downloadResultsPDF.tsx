import { useState } from "react";
import { api } from "@/trpc/api";
import { toast } from "sonner";

interface Props {
  hackathonId: string;
  hackathonName: string;
}

type Participation = {
  id: string;
  title: string;
  creatorName: string;
  team_members: unknown;
  categoryId: string | null;
  categoryName: string | null;
  scores: { judgeId: string; criterionId: string | null; score: number }[];
  averageScore: number;
  completeJudges: number;
  isEligible: boolean;
  rank: number | null;
};

type ExportData = {
  hackathonName: string;
  criteria: { id: string; name: string; weight: number }[];
  judges: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  participations: Participation[];
};

function getTeamName(p: { team_members: unknown; creatorName: string }): string {
  const tm = p.team_members as { team_name?: string } | null | undefined;
  return tm?.team_name || p.creatorName;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function buildRow(
  p: Participation,
  judges: ExportData["judges"],
  criteria: ExportData["criteria"],
  hasCriteria: boolean,
  includeCategory: boolean,
): (string | number)[] {
  const row: (string | number)[] = [];

  row.push(p.rank !== null ? p.rank : "—");
  if (includeCategory) row.push(p.categoryName ? truncate(p.categoryName, 20) : "—");
  row.push(truncate(getTeamName(p), 30));
  row.push(truncate(p.title, 40));
  row.push(p.averageScore > 0 ? p.averageScore.toFixed(2) : "—");

  if (hasCriteria) {
    for (const judge of judges) {
      const judgeScores = p.scores.filter((s) => s.judgeId === judge.id && s.criterionId !== null);
      const scoreMap = new Map(judgeScores.map((s) => [s.criterionId!, s.score]));
      const isComplete = scoreMap.size >= criteria.length;

      if (isComplete) {
        let ws = 0;
        for (const c of criteria) ws += (scoreMap.get(c.id) ?? 0) * (c.weight / 100);
        row.push(ws.toFixed(2));
      } else {
        row.push("—");
      }

      for (const c of criteria) {
        const s = scoreMap.get(c.id);
        row.push(s !== undefined ? s.toString() : "—");
      }
    }

    for (const c of criteria) {
      const vals = p.scores.filter((s) => s.criterionId === c.id).map((s) => s.score);
      row.push(vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "—");
    }
  } else {
    for (const judge of judges) {
      const flat = p.scores.find((s) => s.judgeId === judge.id && s.criterionId === null);
      row.push(flat !== undefined ? flat.score.toFixed(1) : "—");
    }
  }

  return row;
}

async function buildAndDownloadPDF(data: ExportData, hackathonName: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const hasCriteria = data.criteria.length > 0;
  const hasCategories = data.categories.length > 0;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const exportDate = new Date().toLocaleString();

  doc.setFontSize(15);
  doc.setTextColor(30, 30, 30);
  doc.text(`${hackathonName} — Judging Results`, 14, 14);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Exported: ${exportDate}`, 14, 20);

  if (data.participations.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("No submissions found.", 14, 32);
    doc.save(`${safeFileName(hackathonName)}-judging-results.pdf`);
    return;
  }

  // Build column headers
  const fixedHeaders = hasCategories
    ? ["Rank", "Category", "Team", "Project / Application", "Overall Score"]
    : ["Rank", "Team", "Project / Application", "Overall Score"];

  const judgeHeaders: string[] = [];
  if (hasCriteria) {
    for (const judge of data.judges) {
      const jName = truncate(judge.name, 18);
      judgeHeaders.push(`${jName}\nFinal`);
      for (const c of data.criteria) {
        judgeHeaders.push(`${jName}\n${truncate(c.name, 14)} (${c.weight}%)`);
      }
    }
    for (const c of data.criteria) {
      judgeHeaders.push(`Avg\n${truncate(c.name, 14)}`);
    }
  } else {
    for (const judge of data.judges) {
      judgeHeaders.push(truncate(judge.name, 18));
    }
  }

  const headers = [...fixedHeaders, ...judgeHeaders];

  // Column widths
  const fixedColWidths = hasCategories ? [10, 22, 34, 48, 18] : [10, 38, 52, 18];
  const totalCols = headers.length;
  const remainingWidth = pageWidth - 28 - fixedColWidths.reduce((a, b) => a + b, 0);
  const dynamicCols = totalCols - fixedColWidths.length;
  const dynWidth = dynamicCols > 0 ? Math.max(10, remainingWidth / dynamicCols) : 14;

  const columnStyles: Record<number, { cellWidth: number }> = {};
  fixedColWidths.forEach((w, i) => { columnStyles[i] = { cellWidth: w }; });
  for (let i = fixedColWidths.length; i < totalCols; i++) {
    columnStyles[i] = { cellWidth: dynWidth };
  }

  const tableOptions = {
    head: [headers],
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: "linebreak" as const,
      valign: "middle" as const,
      lineColor: [210, 210, 210] as [number, number, number],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [25, 25, 35] as [number, number, number],
      textColor: [220, 220, 220] as [number, number, number],
      fontSize: 7,
      fontStyle: "bold" as const,
      halign: "center" as const,
      valign: "middle" as const,
      cellPadding: 2,
    },
    alternateRowStyles: { fillColor: [248, 248, 250] as [number, number, number] },
    bodyStyles: { textColor: [40, 40, 40] as [number, number, number] },
    columnStyles,
    margin: { top: 12, left: 14, right: 14 },
    didDrawPage: (hookData: { pageNumber: number }) => {
      const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${hackathonName} — Judging Results  |  Page ${hookData.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" },
      );
    },
  };

  if (hasCategories) {
    // Separate table section per category
    let startY = 25;

    const groups: { label: string; items: Participation[] }[] = data.categories.map((cat) => ({
      label: cat.name,
      items: data.participations.filter((p) => p.categoryId === cat.id),
    }));

    const uncategorized = data.participations.filter((p) => !p.categoryId);
    if (uncategorized.length > 0) {
      groups.push({ label: "Uncategorized", items: uncategorized });
    }

    for (const group of groups) {
      if (group.items.length === 0) continue;

      // Category section heading
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text(group.label, 14, startY + 3);
      doc.setFont("helvetica", "normal");

      // Per-section table: no Category column (already split by category heading)
      const sectionFixedHeaders = ["Rank", "Team", "Project / Application", "Overall Score"];
      const sectionHeaders = [...sectionFixedHeaders, ...judgeHeaders];
      const sectionFixedWidths = [10, 38, 52, 18];
      const sectionRemaining = pageWidth - 28 - sectionFixedWidths.reduce((a, b) => a + b, 0);
      const sectionDynWidth = dynamicCols > 0 ? Math.max(10, sectionRemaining / dynamicCols) : 14;
      const sectionColStyles: Record<number, { cellWidth: number }> = {};
      sectionFixedWidths.forEach((w, i) => { sectionColStyles[i] = { cellWidth: w }; });
      for (let i = sectionFixedWidths.length; i < sectionHeaders.length; i++) {
        sectionColStyles[i] = { cellWidth: sectionDynWidth };
      }

      // Build rows without the category column
      const sectionRows = group.items.map((p) =>
        buildRow(p, data.judges, data.criteria, hasCriteria, false),
      );

      autoTable(doc, {
        ...tableOptions,
        head: [sectionHeaders],
        body: sectionRows,
        startY: startY + 6,
        columnStyles: sectionColStyles,
      });

      startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      if (startY > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        startY = 14;
      }
    }
  } else {
    // Single flat table
    const rows = data.participations.map((p) =>
      buildRow(p, data.judges, data.criteria, hasCriteria, false),
    );
    autoTable(doc, { ...tableOptions, body: rows, startY: 25 });
  }

  doc.save(`${safeFileName(hackathonName)}-judging-results.pdf`);
}

function safeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function DownloadResultsPDF({ hackathonId, hackathonName }: Props) {
  const [generating, setGenerating] = useState(false);

  const { refetch } = api.scoring.getResultsForExport.useQuery(
    { hackathonId },
    { enabled: false },
  );

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await refetch();
      if (!result.data) {
        toast.error("No data available for export");
        return;
      }
      await buildAndDownloadPDF(result.data, hackathonName);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800/40 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-white disabled:cursor-wait disabled:opacity-50"
    >
      {generating ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-500 border-t-white" />
          Generating…
        </>
      ) : (
        "Download results as PDF"
      )}
    </button>
  );
}
