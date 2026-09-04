"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Moon, Sun, Coffee, Github, Settings, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { MiscGenerator } from "./MiscGenerator"
import { useTranslation } from "@/hooks/useTranslation"
import { LOREM_MAX_LENGTH, LOREM_MIN_LENGTH, clampLoremLength, generateLoremText } from "@/lib/lorem"
import { copyTextToClipboard } from "@/lib/clipboard"
import { useTheme } from "next-themes"

const LANGUAGE_STORAGE_KEY = "fadelytext-language"

export default function FadelyTextUI() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [generatedText, setGeneratedText] = useState("")
  const [characterCount, setCharacterCount] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [lineCount, setLineCount] = useState(0)
  const [characterSize, setCharacterSize] = useState(100)
  const [loremMaxWarning, setLoremMaxWarning] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [removeSpaces, setRemoveSpaces] = useState(false)
  const [removeSpecialChars, setRemoveSpecialChars] = useState(false)
  const [language, setLanguage] = useState<"en" | "tr">("en")
  const [activeTab, setActiveTab] = useState<"generate" | "counter" | "misc">("generate")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation(language)

  useEffect(() => {
    // Hydration guard for client-only UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

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
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false)
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

  const generateText = () => {
    if (characterSize > LOREM_MAX_LENGTH) {
      // Over the limit: warn instead of silently clamping, then generate at the max.
      setLoremMaxWarning(true)
      setCharacterSize(LOREM_MAX_LENGTH)
      setGeneratedText(generateLoremText(LOREM_MAX_LENGTH, { removeSpaces, removeSpecialChars }))
      return
    }
    setLoremMaxWarning(false)
    const size = clampLoremLength(characterSize)
    // Keep the control in sync when it held an out-of-range value.
    setCharacterSize(size)
    setGeneratedText(generateLoremText(size, { removeSpaces, removeSpecialChars }))
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCharacterCount(text.length)
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length)
    setLineCount(text.length > 0 ? text.split(/\r\n|\r|\n/).length : 0)
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
        <a href="#main-content" className="flex items-center gap-2" aria-label={t("textTools")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">T</span>
          <span className="font-semibold tracking-tight">{t("textTools")}</span>
        </a>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 sm:flex">
          <button type="button" onClick={() => setActiveTab("generate")} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("generate")}</button>
          <button type="button" onClick={() => setActiveTab("counter")} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("counter")}</button>
          <button type="button" onClick={() => setActiveTab("misc")} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{t("misc")}</button>
        </nav>
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <Switch checked={isDark} onCheckedChange={toggleTheme} />
          <Moon className="h-4 w-4" />
          <div ref={settingsRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("settings")}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <Settings className="h-4 w-4" />
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">{t("generate")}</TabsTrigger>
          <TabsTrigger value="counter">{t("counter")}</TabsTrigger>
          <TabsTrigger value="misc">{t("misc")}</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="character-size">{t("characters")}</Label>
            <Input
              id="character-size"
              type="number"
              min={LOREM_MIN_LENGTH}
              max={LOREM_MAX_LENGTH}
              step={1}
              value={characterSize}
              onChange={(e) => {
                const raw = Number(e.target.value)
                setCharacterSize(raw)
                setLoremMaxWarning(raw > LOREM_MAX_LENGTH)
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
          <Textarea
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            placeholder={t("generatedTextPlaceholder")}
            className="h-[300px]"
          />
          <Button variant="outline" className="w-full bg-transparent" onClick={() => copyToClipboard(generatedText)}>
            {t("copyToClipboard")}
          </Button>
        </TabsContent>
        <TabsContent value="counter" className="space-y-4">
          <Textarea onChange={handleTextChange} placeholder={t("typeOrPastePlaceholder")} className="h-[200px]" />
          <div className="text-center text-lg font-semibold">
            {`${t("charactersCount", { count: characterCount })} | ${t("wordsCount", { count: wordCount })} | ${t(
              "linesCount",
              { count: lineCount > 0 ? lineCount : "-" },
            )}`}
          </div>
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => {
              const textarea = document.querySelector("textarea") as HTMLTextAreaElement
              if (textarea) {
                textarea.value = ""
                handleTextChange({ target: textarea } as React.ChangeEvent<HTMLTextAreaElement>)
              }
            }}
          >
            {t("clearText")}
          </Button>
          <div className="flex justify-between items-center mt-4">
            <a
              href="https://buymeacoffee.com/notdepressedeveloper"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Coffee className="h-4 w-4" />
              <span>{t("buyMeACoffee")}</span>
            </a>
            <a
              href="https://github.com/sevilayerkan/test-string-extention"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </TabsContent>
        <TabsContent value="misc" className="space-y-4">
          <MiscGenerator onCopy={showNotificationMessage} language={language} />
        </TabsContent>
      </Tabs>
      <footer className="mt-6 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span>FadelyText v1.0</span>
        <div className="flex items-center gap-3">
          <a href="https://buymeacoffee.com/notdepressedeveloper" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground" aria-label="Buy me a coffee"><Coffee className="h-3.5 w-3.5" /> Coffee</a>
          <a href="https://github.com/sevilayerkan/test-string-extention" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground" aria-label="GitHub"><Github className="h-3.5 w-3.5" /> GitHub</a>
          <a href="mailto:notdepressedeveloper@gmail.com" className="flex items-center gap-1 hover:text-foreground" aria-label={t("support")}><Settings className="h-3.5 w-3.5" /> {t("support")}</a>
        </div>
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
