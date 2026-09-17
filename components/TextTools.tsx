"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  toUpper,
  toLower,
  toTitle,
  toSlug,
  sortLines,
  dedupeLines,
  sortAndDedupeLines,
  cleanWhitespace,
  base64Encode,
  base64Decode,
  diffLines,
  parseToolsUrlParams,
  TOOL_IDS,
  type DiffLine,
  type ToolId,
} from "@/lib/text-tools";

type Props = {
  onCopy: (message: string) => void;
  language: "en" | "tr";
  /** Controlled tool (hamburger menu deep-links). Uncontrolled when omitted. */
  selectedTool?: ToolId;
  onSelectedToolChange?: (tool: ToolId) => void;
};

function syncToolsUrl(tool: ToolId): void {
  try {
    const params = new URLSearchParams(window.location.search);
    params.set("tool", tool);
    params.set("tab", "tools");
    for (const k of ["type", "count", "format", "country", "gender"] as const) params.delete(k);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  } catch {
    // Non-browser / restricted context: no-op
  }
}

function ToolCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

export function TextTools({ onCopy, language, selectedTool, onSelectedToolChange }: Props) {
  const { t } = useTranslation(language);
  const [internalTool, setInternalTool] = useState<ToolId>("case");
  // Controlled when the hamburger menu drives the selection; otherwise local state.
  const tool = selectedTool ?? internalTool;
  const setTool = (next: ToolId) => {
    setInternalTool(next);
    onSelectedToolChange?.(next);
  };

  // Restore selected tool from URL (e.g. ?tool=diff) on mount.
  // When controlled, the parent already restored it — just sync this mount.
  const didInit = useRef(false);
  useEffect(() => {
    const parsed = parseToolsUrlParams(window.location.search);
    if (parsed.tool && (TOOL_IDS as readonly string[]).includes(parsed.tool)) {
      if (selectedTool === undefined) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTool(parsed.tool);
      } else {
        syncToolsUrl(parsed.tool);
      }
    }
    didInit.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hamburger menu deep-link: keep the share URL in sync when the parent
  // picks a new tool. Each card keeps its own input state, so no
  // regeneration is needed — just reveal the selected card.
  const prevExternalTool = useRef(selectedTool);
  useEffect(() => {
    if (selectedTool === undefined || !didInit.current) return;
    if (prevExternalTool.current === selectedTool) return;
    prevExternalTool.current = selectedTool;
    syncToolsUrl(selectedTool);
  }, [selectedTool]);

  // ---- Case ----
  const [caseInput, setCaseInput] = useState("");
  const [caseOutput, setCaseOutput] = useState("");

  // ---- Lines ----
  const [linesInput, setLinesInput] = useState("");
  const [linesOutput, setLinesOutput] = useState("");

  // ---- Whitespace ----
  const [wsInput, setWsInput] = useState("");
  const [wsOutput, setWsOutput] = useState("");

  // ---- Base64 ----
  const [b64Input, setB64Input] = useState("");
  const [b64Output, setB64Output] = useState("");
  const [b64Error, setB64Error] = useState<string | null>(null);

  // ---- Diff ----
  const [diffA, setDiffA] = useState("");
  const [diffB, setDiffB] = useState("");
  const diffResult: DiffLine[] = useMemo(() => {
    if (diffA === "" && diffB === "") return [];
    return diffLines(diffA, diffB);
  }, [diffA, diffB]);

  const copy = async (text: string) => {
    if (!text) {
      onCopy(t("noTextToCopy"));
      return;
    }
    const ok = await copyTextToClipboard(text);
    onCopy(ok ? t("copiedToClipboard") : t("copyFailed"));
  };

  const shareLink = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("tool", tool);
      params.set("tab", "tools");
      for (const k of ["type", "count", "format", "country", "gender"] as const) params.delete(k);
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", url);
      const ok = await copyTextToClipboard(window.location.href);
      onCopy(ok ? t("miscLinkCopied") : t("copyFailed"));
    } catch {
      const ok = await copyTextToClipboard(window.location.href);
      onCopy(ok ? t("miscLinkCopied") : t("copyFailed"));
    }
  };

  const locale = language === "tr" ? "tr" : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <label className="grid flex-1 gap-1.5 text-sm font-medium">
          <span>{t("toolsSelectLabel")}</span>
          <Select
            value={tool}
            onValueChange={(v) => {
              const next = v as ToolId;
              setTool(next);
              syncToolsUrl(next);
            }}
          >
            <SelectTrigger aria-label={t("toolsSelectLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="case">{t("toolsCaseTitle")}</SelectItem>
              <SelectItem value="lines">{t("toolsLinesTitle")}</SelectItem>
              <SelectItem value="ws">{t("toolsWsTitle")}</SelectItem>
              <SelectItem value="b64">{t("toolsB64Title")}</SelectItem>
              <SelectItem value="diff">{t("toolsDiffTitle")}</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={shareLink} className="mb-[1px] shrink-0">
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t("miscShare")}
        </Button>
      </div>

      {tool === "case" && (
        <ToolCard title={t("toolsCaseTitle")}>
          <Textarea
            value={caseInput}
            onChange={(e) => setCaseInput(e.target.value)}
            placeholder={t("toolsCasePlaceholder")}
            className="min-h-[90px] font-mono text-sm"
            aria-label={t("toolsCasePlaceholder")}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setCaseOutput(toUpper(caseInput, locale))}>
              {t("toolsUpper")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setCaseOutput(toLower(caseInput, locale))}>
              {t("toolsLower")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setCaseOutput(toTitle(caseInput, locale))}>
              {t("toolsTitle")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setCaseOutput(toSlug(caseInput))}>
              {t("toolsSlug")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(caseOutput)}>
              {t("miscCopy")}
            </Button>
          </div>
          <Textarea
            value={caseOutput}
            onChange={(e) => setCaseOutput(e.target.value)}
            placeholder={t("toolsOutputPlaceholder")}
            className="mt-2 min-h-[90px] font-mono text-sm"
            aria-label={t("toolsOutputPlaceholder")}
          />
        </ToolCard>
      )}

      {tool === "lines" && (
        <ToolCard title={t("toolsLinesTitle")}>
          <Textarea
            value={linesInput}
            onChange={(e) => setLinesInput(e.target.value)}
            placeholder={t("toolsLinesPlaceholder")}
            className="min-h-[110px] font-mono text-sm"
            aria-label={t("toolsLinesPlaceholder")}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setLinesOutput(sortLines(linesInput))}>
              {t("toolsSortAz")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLinesOutput(sortLines(linesInput, { desc: true }))}>
              {t("toolsSortZa")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLinesOutput(dedupeLines(linesInput))}>
              {t("toolsDedupe")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLinesOutput(sortAndDedupeLines(linesInput))}>
              {t("toolsSortAndDedupe")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(linesOutput)}>
              {t("miscCopy")}
            </Button>
          </div>
          <Textarea
            value={linesOutput}
            onChange={(e) => setLinesOutput(e.target.value)}
            placeholder={t("toolsOutputPlaceholder")}
            className="mt-2 min-h-[110px] font-mono text-sm"
            aria-label={t("toolsOutputPlaceholder")}
          />
        </ToolCard>
      )}

      {tool === "ws" && (
        <ToolCard title={t("toolsWsTitle")}>
          <Textarea
            value={wsInput}
            onChange={(e) => setWsInput(e.target.value)}
            placeholder={t("toolsWsPlaceholder")}
            className="min-h-[110px] font-mono text-sm"
            aria-label={t("toolsWsPlaceholder")}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setWsOutput(cleanWhitespace(wsInput))}>
              {t("toolsWsClean")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(wsOutput)}>
              {t("miscCopy")}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("toolsWsHint")}</p>
          <Textarea
            value={wsOutput}
            onChange={(e) => setWsOutput(e.target.value)}
            placeholder={t("toolsOutputPlaceholder")}
            className="mt-2 min-h-[110px] font-mono text-sm"
            aria-label={t("toolsOutputPlaceholder")}
          />
        </ToolCard>
      )}

      {tool === "b64" && (
        <ToolCard title={t("toolsB64Title")}>
          <Textarea
            value={b64Input}
            onChange={(e) => {
              setB64Input(e.target.value);
              setB64Error(null);
            }}
            placeholder={t("toolsB64Placeholder")}
            className="min-h-[110px] font-mono text-sm"
            aria-label={t("toolsB64Placeholder")}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setB64Error(null);
                setB64Output(base64Encode(b64Input));
              }}
            >
              {t("toolsB64Encode")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const res = base64Decode(b64Input);
                if (res.ok) {
                  setB64Error(null);
                  setB64Output(res.value);
                } else {
                  setB64Error(res.error);
                }
              }}
            >
              {t("toolsB64Decode")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(b64Output)}>
              {t("miscCopy")}
            </Button>
          </div>
          {b64Error && (
            <p role="alert" className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {b64Error}
            </p>
          )}
          <Textarea
            value={b64Output}
            onChange={(e) => setB64Output(e.target.value)}
            placeholder={t("toolsOutputPlaceholder")}
            className="mt-2 min-h-[110px] font-mono text-sm"
            aria-label={t("toolsOutputPlaceholder")}
          />
        </ToolCard>
      )}

      {tool === "diff" && (
        <ToolCard title={t("toolsDiffTitle")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="tools-diff-before" className="text-xs font-medium text-muted-foreground">{t("toolsDiffBefore")}</label>
              <Textarea
                id="tools-diff-before"
                value={diffA}
                onChange={(e) => setDiffA(e.target.value)}
                placeholder={t("toolsDiffPlaceholderA")}
                className="min-h-[140px] font-mono text-sm"
                aria-label={t("toolsDiffBefore")}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="tools-diff-after" className="text-xs font-medium text-muted-foreground">{t("toolsDiffAfter")}</label>
              <Textarea
                id="tools-diff-after"
                value={diffB}
                onChange={(e) => setDiffB(e.target.value)}
                placeholder={t("toolsDiffPlaceholderB")}
                className="min-h-[140px] font-mono text-sm"
                aria-label={t("toolsDiffAfter")}
              />
            </div>
          </div>
          <div
            className="mt-3 max-h-[320px] overflow-auto rounded-md border bg-muted/30 font-mono text-xs"
            aria-live="polite"
            aria-label={t("toolsDiffTitle")}
          >
            {diffResult.length === 0 ? (
              <p className="px-3 py-3 text-muted-foreground">{t("toolsDiffEmpty")}</p>
            ) : (
              <ul className="divide-y">
                {diffResult.map((line, idx) => (
                  <li
                    key={`${line.type}-${idx}-${line.text.length}-${line.text.slice(0, 32)}`}
                    className={
                      line.type === "added"
                        ? "bg-green-500/10 px-3 py-1 text-green-700 dark:text-green-300"
                        : line.type === "removed"
                          ? "bg-red-500/10 px-3 py-1 text-red-700 dark:text-red-300"
                          : "px-3 py-1 text-muted-foreground"
                    }
                  >
                    <span aria-hidden="true" className="mr-2 inline-block w-4 select-none">
                      {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                    </span>
                    <span className="whitespace-pre-wrap break-all">{line.text || "∅"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("toolsDiffHint")}</p>
        </ToolCard>
      )}
    </div>
  );
}
