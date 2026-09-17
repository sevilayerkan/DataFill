"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Moon, Sun, Coffee, Github, Settings, Check, Info, Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { AboutPanel } from "./AboutPanel"
import { MiscGenerator, type DataType as MiscDataType } from "./MiscGenerator"
import { DatasetBuilder } from "./DatasetBuilder"
import { TextTools } from "./TextTools"
import { AppMenu, type MainTab } from "./AppMenu"
import { useTranslation } from "@/hooks/useTranslation"
import { LOREM_MAX_LENGTH, LOREM_MIN_LENGTH, clampLoremLength, generateLoremText } from "@/lib/lorem"
import { getTextStats } from "@/lib/text-stats"
import { parseNumericDraft } from "@/lib/numeric-input"
import { copyTextToClipboard } from "@/lib/clipboard"
import { useTheme } from "next-themes"
import { parseMiscUrlParams } from "@/components/MiscGenerator"
import { parseToolsUrlParams, TOOL_IDS, type ToolId } from "@/lib/text-tools"

const LANGUAGE_STORAGE_KEY = "fadelytext-language"

export default function FadelyTextUI() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [generatedText, setGeneratedText] = useState("")
  const [counterText, setCounterText] = useState("")
  const counterRef = useRef<HTMLTextAreaElement>(null)
  const counterStats = useMemo(() => getTextStats(counterText), [counterText])
  const [characterSize, setCharacterSize] = useState(100)
  // Raw input draft: clearing the field or typing a partial value must not
  // push 0/NaN into state. Committed (clamped) on blur/Generate instead.
  const [characterSizeDraft, setCharacterSizeDraft] = useState("100")
  const [loremMaxWarning, setLoremMaxWarning] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [removeSpaces, setRemoveSpaces] = useState(false)
  const [removeSpecialChars, setRemoveSpecialChars] = useState(false)
  const [language, setLanguage] = useState<"en" | "tr">("en")
  const [activeTab, setActiveTab] = useState<"generate" | "counter" | "misc" | "dataset" | "tools">("generate")
  const [miscType, setMiscType] = useState<MiscDataType>("fullName")
  const [activeTool, setActiveTool] = useState<ToolId>("case")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation(language)

  useEffect(() => {
    // Hydration guard for client-only UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Restore tab + tool from URL (share links). Runs once after mount.
  // Data params (tool/type) win over stale `tab` so a buggy `?type=username&tab=generate` still opens the right view.
  useEffect(() => {
    try {
      const search = window.location.search
      const params = new URLSearchParams(search)
      const tab = params.get("tab")
      const validTabs = ["generate", "counter", "misc", "dataset", "tools"] as const
      const miscParsed = parseMiscUrlParams(search)
      const toolsParsed = parseToolsUrlParams(search)
      const hasTool = !!toolsParsed.tool && (TOOL_IDS as readonly string[]).includes(toolsParsed.tool)
      const hasType = !!miscParsed.type
      if (hasTool && toolsParsed.tool) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTool(toolsParsed.tool)
        setActiveTab("tools")
      } else if (hasType && miscParsed.type) {
        setMiscType(miscParsed.type)
        setActiveTab("misc")
      } else if (tab && (validTabs as readonly string[]).includes(tab)) {
        setActiveTab(tab as typeof activeTab)
      }
    } catch {
      // Non-browser / restricted context: ignore
    }
  }, [])

  const goToTab = (tab: MainTab) => setActiveTab(tab)
  // Hamburger deep-links write the share params synchronously so the child
  // generators mount with matching settings (TabsContent unmounts inactive
  // panels, so mount-time URL is what the init effects read).
  const goToMisc = (nextType: MiscDataType) => {
    setMiscType(nextType)
    setActiveTab("misc")
    try {
      const params = new URLSearchParams(window.location.search)
      params.set("type", nextType)
      params.set("tab", "misc")
      params.delete("tool")
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`)
    } catch {
      // Non-browser / restricted context: ignore
    }
  }
  const goToTool = (nextTool: ToolId) => {
    setActiveTool(nextTool)
    setActiveTab("tools")
    try {
      const params = new URLSearchParams(window.location.search)
      params.set("tool", nextTool)
      params.set("tab", "tools")
      for (const k of ["type", "count", "format", "country", "gender"] as const) params.delete(k)
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`)
    } catch {
      // Non-browser / restricted context: ignore
    }
  }

  // Keep `tab` param in sync with the active view (shareable links).
  // Cleans stale params so `?type=username&tab=generate` never happens.
  useEffect(() => {
    if (!mounted) return
    try {
      const params = new URLSearchParams(window.location.search)
      params.set("tab", activeTab)
      const miscKeys = ["type", "count", "format", "country", "gender"] as const
      const toolKeys = ["tool"] as const
      if (activeTab === "generate" || activeTab === "counter" || activeTab === "dataset") {
        for (const k of [...miscKeys, ...toolKeys]) params.delete(k)
        // Default tabs keep URL clean: `/` instead of `?tab=generate`
        if (activeTab === "generate") params.delete("tab")
      } else if (activeTab === "misc") {
        for (const k of toolKeys) params.delete(k)
      } else if (activeTab === "tools") {
        for (const k of miscKeys) params.delete(k)
      }
      const qs = params.toString()
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
    } catch {
      // ignore
    }
  }, [activeTab, mounted])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (stored === "en" || stored === "tr") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguage(stored)
      }
    } catch {
      // localStorage may be unavailable (private mode); fall back to default.
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Ignore persistence failures.
    }
  }, [language, mounted])

  useEffect(() => {
    if (!settingsOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
        settingsButtonRef.current?.focus()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false)
        settingsButtonRef.current?.focus()
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const menu = settingsRef.current?.querySelector('[role="menu"]')
        if (!menu) return
        const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
        if (items.length === 0) return
        event.preventDefault()
        const active = document.activeElement as HTMLElement | null
        const currentIndex = items.findIndex((item) => item === active)
        const nextIndex =
          event.key === "ArrowDown"
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length
        items[nextIndex]?.focus()
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [settingsOpen])

  const isDark = mounted ? (resolvedTheme ?? theme) === "dark" : false

  const toggleTheme = () => {
    const current = resolvedTheme ?? theme ?? "light"
    setTheme(current === "dark" ? "light" : "dark")
  }

  /** Normalize the size draft into state; returns the effective size. */
  const commitCharacterSize = (): number => {
    const parsed = parseNumericDraft(characterSizeDraft)
    if (parsed === null) {
      // Empty/invalid: keep editing, revert the field to the last good value.
      setCharacterSizeDraft(String(characterSize))
      setLoremMaxWarning(false)
      return characterSize
    }
    if (parsed > LOREM_MAX_LENGTH) {
      // Over the limit: warn instead of silently clamping, then generate at the max.
      setLoremMaxWarning(true)
      setCharacterSize(LOREM_MAX_LENGTH)
      setCharacterSizeDraft(String(LOREM_MAX_LENGTH))
      return LOREM_MAX_LENGTH
    }
    const size = clampLoremLength(parsed)
    // Keep the control in sync when it held an out-of-range value.
    setLoremMaxWarning(false)
    setCharacterSize(size)
    setCharacterSizeDraft(String(size))
    return size
  }

  const generateText = () => {
    setGeneratedText(generateLoremText(commitCharacterSize(), { removeSpaces, removeSpecialChars }))
  }

  const clearCounter = () => {
    setCounterText("")
    counterRef.current?.focus()
  }

  const copyToClipboard = async (text: string) => {
    if (text.length > 0) {
      const ok = await copyTextToClipboard(text)
      showNotificationMessage(t(ok ? "copiedToClipboard" : "copyFailed"))
    } else {
      showNotificationMessage(t("noTextToCopy"))
    }
  }

  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    }
  }, [])

  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message)
    setShowNotification(true)
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }
    notificationTimeoutRef.current = setTimeout(() => setShowNotification(false), 2000)
  }

  return (
    <div className="w-full max-w-3xl relative p-4 sm:p-6">
      <header className="mb-5 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-1">
          <AppMenu
            language={language}
            activeTab={activeTab}
            activeMiscType={miscType}
            activeTool={activeTool}
            onNavigateTab={goToTab}
            onNavigateMisc={goToMisc}
            onNavigateTool={goToTool}
          />
          <a href="#main-content" className="flex items-center gap-2" aria-label={t("textTools")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">T</span>
            <span className="font-semibold tracking-tight">{t("textTools")}</span>
          </a>
        </div>
        <nav aria-label={t("primaryNavigation")} className="hidden items-center gap-1 sm:flex">
          <button type="button" onClick={() => setActiveTab("generate")} aria-current={activeTab === "generate" ? "page" : undefined} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("generate")}</button>
          <button type="button" onClick={() => setActiveTab("counter")} aria-current={activeTab === "counter" ? "page" : undefined} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("counter")}</button>
          <button type="button" onClick={() => setActiveTab("misc")} aria-current={activeTab === "misc" ? "page" : undefined} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("misc")}</button>
          <button type="button" onClick={() => setActiveTab("dataset")} aria-current={activeTab === "dataset" ? "page" : undefined} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("dataset")}</button>
          <button type="button" onClick={() => setActiveTab("tools")} aria-current={activeTab === "tools" ? "page" : undefined} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("tools")}</button>
        </nav>
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4" aria-hidden="true" />
          <Switch checked={isDark} onCheckedChange={toggleTheme} aria-label={t("toggleTheme")} />
          <Moon className="h-4 w-4" aria-hidden="true" />
          <div ref={settingsRef} className="relative">
            <Button
              ref={settingsButtonRef}
              variant="ghost"
              size="icon"
              aria-label={t("settings")}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
            {settingsOpen && (
              <div
                role="menu"
                aria-label={t("settings")}
                className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border bg-popover p-1.5 text-popover-foreground shadow-md"
              >
                <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">{t("language")}</p>
                {(
                  [
                    { code: "en" as const, label: t("english") },
                    { code: "tr" as const, label: t("turkish") },
                  ]
                ).map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === option.code}
                    onClick={() => {
                      setLanguage(option.code)
                      setSettingsOpen(false)
                    }}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    <span>{option.label}</span>
                    {language === option.code && <Check className="h-4 w-4" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
        <TabsList
          className="grid w-full grid-cols-5"
          style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
        >
          <TabsTrigger value="generate">{t("generate")}</TabsTrigger>
          <TabsTrigger value="counter">{t("counter")}</TabsTrigger>
          <TabsTrigger value="misc">{t("misc")}</TabsTrigger>
          <TabsTrigger value="dataset">{t("dataset")}</TabsTrigger>
          <TabsTrigger value="tools">{t("tools")}</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="character-size">{t("characters")}</Label>
            <Input
              id="character-size"
              type="number"
              inputMode="numeric"
              min={LOREM_MIN_LENGTH}
              max={LOREM_MAX_LENGTH}
              step={1}
              value={characterSizeDraft}
              onChange={(e) => {
                const raw = e.target.value
                setCharacterSizeDraft(raw)
                const parsed = parseNumericDraft(raw)
                setLoremMaxWarning(parsed !== null && parsed > LOREM_MAX_LENGTH)
              }}
              onBlur={() => {
                commitCharacterSize()
              }}
              className="w-20"
            />
            <Button onClick={generateText} className="flex-grow">
              {t("generateText")}
            </Button>
          </div>
          {loremMaxWarning && (
            <p
              role="alert"
              className="rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-200"
            >
              {t("loremMaxLengthWarning", { max: LOREM_MAX_LENGTH })}
            </p>
          )}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spaces"
                checked={removeSpaces}
                onCheckedChange={(checked) => setRemoveSpaces(checked as boolean)}
              />
              <Label htmlFor="spaces">{t("noSpaces")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="special-chars"
                checked={removeSpecialChars}
                onCheckedChange={(checked) => setRemoveSpecialChars(checked as boolean)}
              />
              <Label htmlFor="special-chars">{t("noSpecialCharacters")}</Label>
            </div>
          </div>
          <Label htmlFor="generated-text" className="sr-only">{t("generatedTextLabel")}</Label>
          <Textarea
            id="generated-text"
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            placeholder={t("generatedTextPlaceholder")}
            aria-label={t("generatedTextLabel")}
            className="h-[300px]"
          />
          <Button variant="outline" className="w-full bg-transparent" onClick={() => copyToClipboard(generatedText)}>
            {t("copyToClipboard")}
          </Button>
        </TabsContent>
        <TabsContent value="counter" className="space-y-4">
          <Label htmlFor="counter-text" className="sr-only">{t("counterTextLabel")}</Label>
          <Textarea
            id="counter-text"
            ref={counterRef}
            value={counterText}
            onChange={(e) => setCounterText(e.target.value)}
            placeholder={t("typeOrPastePlaceholder")}
            aria-label={t("counterTextLabel")}
            className="h-[200px]"
          />
          <div className="text-center text-lg font-semibold">
            {`${t("charactersCount", { count: counterStats.characters })} | ${t("wordsCount", { count: counterStats.words })} | ${t(
              "linesCount",
              { count: counterStats.lines > 0 ? counterStats.lines : "-" },
            )}`}
          </div>
          <Button variant="outline" className="w-full bg-transparent" onClick={clearCounter}>
            {t("clearText")}
          </Button>
          <div className="flex justify-between items-center mt-4">
            <a
              href="https://buymeacoffee.com/notdepressedeveloper"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Coffee className="h-4 w-4" aria-hidden="true" />
              <span>{t("buyMeACoffee")}</span>
            </a>
            <a
              href="https://github.com/sevilayerkan/test-string-extention"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>GitHub</span>
            </a>
          </div>
        </TabsContent>
        <TabsContent value="misc" className="space-y-4">
          <MiscGenerator
            onCopy={showNotificationMessage}
            language={language}
            selectedType={miscType}
            onSelectedTypeChange={setMiscType}
          />
        </TabsContent>
        <TabsContent value="tools" className="space-y-4">
          <TextTools
            onCopy={showNotificationMessage}
            language={language}
            selectedTool={activeTool}
            onSelectedToolChange={setActiveTool}
          />
        </TabsContent>
        <TabsContent value="dataset" className="mt-2 space-y-4">
          <DatasetBuilder onCopy={showNotificationMessage} language={language} />
        </TabsContent>
      </Tabs>
      <footer className="mt-6 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>FadelyText v1.0</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAboutOpen((open) => !open)}
              aria-expanded={aboutOpen}
              aria-controls="about-panel"
              className="flex items-center gap-1 hover:text-foreground hover:underline"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" /> {t("about")}
            </button>
            <a href="https://buymeacoffee.com/notdepressedeveloper" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground" aria-label="Buy me a coffee"><Coffee className="h-3.5 w-3.5" aria-hidden="true" /> Coffee</a>
            <a href="https://github.com/sevilayerkan/test-string-extention" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground" aria-label="GitHub"><Github className="h-3.5 w-3.5" aria-hidden="true" /> GitHub</a>
            <a href="mailto:notdepressedeveloper@gmail.com" className="flex items-center gap-1 hover:text-foreground" aria-label={t("support")}><Mail className="h-3.5 w-3.5" aria-hidden="true" /> {t("support")}</a>
          </div>
        </div>
        {aboutOpen && (
          <div id="about-panel" className="mt-3 border-t pt-4">
            <AboutPanel language={language} />
          </div>
        )}
      </footer>
      {showNotification && (
        <div className="fixed bottom-6 left-1/2 z-[100] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2">
          <Alert role="status" className="border-green-400 bg-green-100 text-green-700 shadow-lg">
            <AlertDescription className="text-center">{notificationMessage}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
