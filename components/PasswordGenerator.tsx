"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useTranslation } from "@/hooks/useTranslation"
import { passwordData as enPasswordData } from "@/data/en/password-data"
import { passwordData as trPasswordData } from "@/data/tr/password-data"

interface PasswordGeneratorProps {
  language: "en" | "tr"
  onCopy: (message: string) => void
}

type PasswordSource = "random" | "wordlist"

const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Saf rastgele şifre: kelime yok, Türkçe karakter yok — sadece ASCII harf + rakam (+simgeler). */
function randomPassword(length: number): string {
  const chars: string[] = Array.from(
    { length },
    () => CHARSET.charAt(Math.floor(Math.random() * CHARSET.length)),
  )
  // Harf + rakam karışıklığını garantile: eksik sınıf varsa farklı konuma zorla yerleştir.
  const pickIndex = (exclude: number) => {
    let i = Math.floor(Math.random() * length)
    while (i === exclude) i = Math.floor(Math.random() * length)
    return i
  }
  let result = chars.join("")
  let forced = -1
  if (!/\d/.test(result)) {
    forced = pickIndex(-1)
    chars[forced] = String(Math.floor(Math.random() * 10))
    result = chars.join("")
  }
  if (!/\p{L}/u.test(result)) {
    const i = pickIndex(forced)
    const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    chars[i] = letters.charAt(Math.floor(Math.random() * letters.length))
    result = chars.join("")
  }
  return result
}

export interface WordlistState {
  deck: string[]
  shown: Set<string>
  poolDone: boolean
}

export function createWordlistState(): WordlistState {
  return { deck: [], shown: new Set(), poolDone: false }
}

/**
 * Hibrit kelime listesi: havuzdan ve rastgele üretimden yarı yarıya harmanlanır.
 * Havuz tekrarsız dağıtılır, rastgeleler gösterilen hiçbir şifreyle çakışmaz,
 * havuz bitince tamamen rastgeleye dönülür.
 */
export function nextWordlistPassword(
  state: WordlistState,
  pool: readonly string[],
  makeRandom: () => string,
  pickPool: () => boolean = () => Math.random() < 0.5,
): string {
  if (!state.poolDone) {
    if (state.deck.length === 0) {
      const remaining = pool.filter((item) => !state.shown.has(item))
      if (remaining.length === 0) {
        state.poolDone = true
      } else {
        state.deck = shuffled(remaining)
      }
    }
    if (!state.poolDone && pickPool()) {
      const next = state.deck.pop() as string
      state.shown.add(next)
      return next
    }
  }
  let candidate = makeRandom()
  for (let attempt = 0; attempt < 100 && state.shown.has(candidate); attempt++) {
    candidate = makeRandom()
  }
  state.shown.add(candidate)
  return candidate
}

export function PasswordGenerator({ language, onCopy }: PasswordGeneratorProps) {
  const { t } = useTranslation(language)
  const [password, setPassword] = useState("")
  const [length, setLength] = useState(12)
  const [source, setSource] = useState<PasswordSource>("random")
  // Oturum içinde gösterilenler: random modda ve hibrit liste modunda tekrarı engeller.
  const seenRandom = useRef<Set<string>>(new Set())
  const wordlist = useRef<WordlistState>(createWordlistState())
  const wordlistLang = useRef(language)

  // Rastgele üretim dil bağımsız: kelimesiz, Türkçe karaktersiz saf ASCII.
  const makeRandom = () => randomPassword(length)

  const generatePassword = () => {
    try {
      if (source === "wordlist") {
        // Hibrit liste: havuz + saf rastgele üretim yarı yarıya harmanlanır.
        const pool = (language === "tr" ? trPasswordData : enPasswordData).mixed
        if (wordlistLang.current !== language) {
          wordlistLang.current = language
          wordlist.current.deck = []
          wordlist.current.poolDone = false
        }
        setPassword(nextWordlistPassword(wordlist.current, pool, makeRandom))
        return
      }

      let candidate = makeRandom()
      for (let attempt = 0; attempt < 100 && seenRandom.current.has(candidate); attempt++) {
        candidate = makeRandom()
      }
      seenRandom.current.add(candidate)
      setPassword(candidate)
    } catch (error) {
      console.error("Error generating password:", error)
      onCopy("Error generating password")
    }
  }

  const copyToClipboard = () => {
    if (password) {
      navigator.clipboard.writeText(password)
      onCopy(t("passwordCopied"))
    } else {
      onCopy(t("noPasswordToCopy"))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Label htmlFor="password-source-select">{t("passwordSource")}</Label>
        <Select value={source} onValueChange={(value: PasswordSource) => setSource(value)}>
          <SelectTrigger className="w-[140px]" id="password-source-select">
            <SelectValue placeholder={t("selectPasswordSource")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="random">{t("random")}</SelectItem>
            <SelectItem value="wordlist">{t("wordlist")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("passwordLength", { length })}</Label>
        <Slider
          value={[length]}
          onValueChange={(value) => setLength(value[0])}
          min={8}
          max={32}
          step={1}
          disabled={source === "wordlist"}
        />
      </div>
      <Button onClick={generatePassword} className="w-full">
        {t("generatePassword")}
      </Button>
      <Input value={password} readOnly />
      <Button variant="outline" className="w-full bg-transparent" onClick={copyToClipboard}>
        {t("copyToClipboard")}
      </Button>
    </div>
  )
}
