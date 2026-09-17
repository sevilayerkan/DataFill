"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/hooks/useTranslation"
import { copyTextToClipboard } from "@/lib/clipboard"
import { emailData as enEmailData } from "@/data/en/email-data"
import { emailData as trEmailData } from "@/data/tr/email-data"
import { nameData as enNameData } from "@/data/en/name-data"
import { nameData as trNameData } from "@/data/tr/name-data"
import { foldTrLower } from "@/lib/tr-fake"

interface EmailGeneratorProps {
  language: "en" | "tr"
  onCopy: (message: string) => void
}

export function EmailGenerator({ language, onCopy }: EmailGeneratorProps) {
  const { t } = useTranslation(language)
  const [email, setEmail] = useState("")
  const [domain, setDomain] = useState("")

  const generateEmail = () => {
    try {
      const isTr = language === "tr"
      const emailData = isTr ? trEmailData : enEmailData
      const nameData = isTr ? trNameData : enNameData
      const domains = domain ? [domain] : emailData.domains
      const firsts = [...nameData.maleNames, ...nameData.femaleNames]
      const firstRaw = firsts[Math.floor(Math.random() * firsts.length)]
      const lastRaw = nameData.lastNames[Math.floor(Math.random() * nameData.lastNames.length)]
      const first = isTr ? foldTrLower(firstRaw) : firstRaw.toLowerCase()
      const last = isTr ? foldTrLower(lastRaw) : lastRaw.toLowerCase()
      const roll = Math.random() * 100
      let local: string
      if (roll < 40) local = `${first}.${last}`
      else if (roll < 60) local = `${first}${last}`
      else if (roll < 75) local = `${first}_${last}`
      else if (roll < 90) local = `${first[0]}${last}`
      else local = `${first}.${last[0]}`
      // Short, human suffix at most — never the old 8-digit `user12345678` shape.
      if (Math.random() >= 0.5) local += String(Math.floor(Math.random() * 100))
      const randomDomain = domains[Math.floor(Math.random() * domains.length)]
      setEmail(`${local}@${randomDomain}`)
    } catch (error) {
      console.error("Error generating email:", error)
      onCopy("Error generating email")
    }
  }

  const copyToClipboard = async () => {
    if (email) {
      const ok = await copyTextToClipboard(email)
      onCopy(t(ok ? "emailCopied" : "copyFailed"))
    } else {
      onCopy(t("noEmailToCopy"))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Label htmlFor="custom-domain">{t("customDomain")}</Label>
        <Input
          id="custom-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={t("customDomainPlaceholder")}
        />
      </div>
      <Button onClick={generateEmail} className="w-full">
        {t("generateEmail")}
      </Button>
      <Label htmlFor="generated-email" className="sr-only">{t("email")}</Label>
      <Input id="generated-email" value={email} readOnly aria-label={t("email")} />
      <Button variant="outline" className="w-full bg-transparent" onClick={copyToClipboard}>
        {t("copyToClipboard")}
      </Button>
    </div>
  )
}
