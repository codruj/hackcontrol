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

function safeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function buildAndDownloadPDF(data: ExportData, hackathonName: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const hasCriteria = data.criteria.length > 0;
  const hasCategories = data.categories.length > 0;

  // Fixed column widths in mm
  const rankW = 8;
  const teamW = 30;
  const projectW = 38;
  const overallW = 14;
  const judgeFinalW = 13;
  const criterionW = 10;
  const avgW = 11;

  const fixedW = rankW + teamW + projectW + overallW;
  const judgesW = data.judges.length * (judgeFinalW + data.criteria.length * criterionW);
  const avgsW = hasCriteria ? data.criteria.length * avgW : 0;
  const totalW = fixedW + judgesW + avgsW;

  const marginH = 14;
  const a4Usable = 297 - marginH * 2;
  const a3Usable = 420 - marginH * 2;

  let pageFormat: string | number[] = "a4";
  if (totalW > a4Usable) {
    pageFormat = totalW > a3Usable ? [totalW + marginH * 2 + 8, 210] : "a3";
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: pageFormat });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fontSize = pageFormat === "a4" ? 7 : 6.5;
  const exportDate = new Date().toLocaleString();

  const drawFooter = (pageNum: number) => {
    const total = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${hackathonName} — Judging Results  |  Page ${pageNum} of ${total}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" },
    );
  };

  // Column styles — indexed by column position
  const colStyles: Record<number, object> = {};
  let ci = 0;
  colStyles[ci++] = { cellWidth: rankW, halign: "center" };
  colStyles[ci++] = { cellWidth: teamW };
  colStyles[ci++] = { cellWidth: projectW };
  colStyles[ci++] = { cellWidth: overallW, halign: "center" };
  for (let j = 0; j < data.judges.length; j++) {
    colStyles[ci++] = { cellWidth: judgeFinalW, halign: "center" };
    for (let k = 0; k < data.criteria.length; k++) {
      colStyles[ci++] = { cellWidth: criterionW, halign: "center" };
    }
  }
  if (hasCriteria) {
    for (let k = 0; k < data.criteria.length; k++) {
      colStyles[ci++] = { cellWidth: avgW, halign: "center" };
    }
  }

  type HeadCell = string | { content: string; rowSpan?: number; colSpan?: number; styles?: object };

  const buildHead = (): HeadCell[][] => {
    if (!hasCriteria) {
      return [[
        "Rank", "Team", "Project / Application", "Overall",
        ...data.judges.map(j => truncate(j.name, 20)),
      ]];
    }

    const row1: HeadCell[] = [
      { content: "Rank", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      { content: "Team", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Project / Application", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Overall", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
    ];
    for (const judge of data.judges) {
      row1.push({
        content: truncate(judge.name, 24),
        colSpan: 1 + data.criteria.length,
        styles: { halign: "center" },
      });
    }
    row1.push({
      content: "Averages",
      colSpan: data.criteria.length,
      styles: { halign: "center" },
    });

    const row2: HeadCell[] = [];
    for (let j = 0; j < data.judges.length; j++) {
      row2.push({ content: "Final", styles: { halign: "center" } });
      for (const c of data.criteria) {
        row2.push({
          content: truncate(c.name, 9) + "\n" + c.weight + "%",
          styles: { halign: "center" },
        });
      }
    }
    for (const c of data.criteria) {
      row2.push({ content: truncate(c.name, 9), styles: { halign: "center" } });
    }

    return [row1, row2];
  };

  const buildRows = (items: Participation[]) =>
    items.map((p) => {
      const row: (string | number)[] = [];
      row.push(p.rank !== null ? p.rank : "—");
      row.push(truncate(getTeamName(p), 28));
      row.push(truncate(p.title, 36));
      row.push(p.averageScore > 0 ? p.averageScore.toFixed(2) : "—");

      if (hasCriteria) {
        for (const judge of data.judges) {
          const js = p.scores.filter((s) => s.judgeId === judge.id && s.criterionId !== null);
          const sm = new Map(js.map((s) => [s.criterionId!, s.score]));
          const complete = sm.size >= data.criteria.length;
          if (complete) {
            let ws = 0;
            for (const c of data.criteria) ws += (sm.get(c.id) ?? 0) * (c.weight / 100);
            row.push(ws.toFixed(2));
          } else {
            row.push("—");
          }
          for (const c of data.criteria) {
            const s = sm.get(c.id);
            row.push(s !== undefined ? s : "—");
          }
        }
        for (const c of data.criteria) {
          const vals = p.scores.filter((s) => s.criterionId === c.id).map((s) => s.score);
          row.push(
            vals.length > 0
              ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
              : "—",
          );
        }
      } else {
        for (const judge of data.judges) {
          const flat = p.scores.find(
            (s) => s.judgeId === judge.id && s.criterionId === null,
          );
          row.push(flat !== undefined ? flat.score.toFixed(1) : "—");
        }
      }
      return row;
    });

  const commonOpts = {
    styles: {
      fontSize,
      cellPadding: 1.5,
      overflow: "linebreak" as const,
      valign: "middle" as const,
      lineColor: [210, 210, 210] as [number, number, number],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [25, 25, 35] as [number, number, number],
      textColor: [220, 220, 220] as [number, number, number],
      fontSize,
      fontStyle: "bold" as const,
      cellPadding: 1.8,
    },
    alternateRowStyles: { fillColor: [248, 248, 250] as [number, number, number] },
    bodyStyles: { textColor: [40, 40, 40] as [number, number, number] },
    columnStyles: colStyles,
    margin: { top: 12, left: marginH, right: marginH },
    didDrawPage: (hookData: { pageNumber: number }) => drawFooter(hookData.pageNumber),
  };

  // Title
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(`${hackathonName} — Judging Results`, marginH, 13);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Exported: ${exportDate}`, marginH, 19);

  if (data.participations.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("No submissions found.", marginH, 30);
    doc.save(`${safeFileName(hackathonName)}-judging-results.pdf`);
    return;
  }

  const head = buildHead();

  if (hasCategories) {
    let curY = 24;

    const groups: { label: string; items: Participation[] }[] = [
      ...data.categories.map((cat) => ({
        label: cat.name,
        items: data.participations.filter((p) => p.categoryId === cat.id),
      })),
    ];
    const uncategorized = data.participations.filter((p) => !p.categoryId);
    if (uncategorized.length > 0) {
      groups.push({ label: "Uncategorized", items: uncategorized });
    }

    for (const group of groups) {
      if (group.items.length === 0) continue;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(group.label, marginH, curY + 4);
      doc.setFont("helvetica", "normal");

      autoTable(doc, {
        ...commonOpts,
        head,
        body: buildRows(group.items),
        startY: curY + 8,
      });

      curY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      if (curY > pageHeight - 30) {
        doc.addPage();
        curY = 14;
      }
    }
  } else {
    autoTable(doc, {
      ...commonOpts,
      head,
      body: buildRows(data.participations),
      startY: 24,
    });
  }

  doc.save(`${safeFileName(hackathonName)}-judging-results.pdf`);
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
