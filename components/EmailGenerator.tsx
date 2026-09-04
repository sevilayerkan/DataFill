"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/hooks/useTranslation"
import { emailData as enEmailData } from "@/data/en/email-data"
import { emailData as trEmailData } from "@/data/tr/email-data"

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
      const emailData = language === "tr" ? trEmailData : enEmailData
      const { names, domains: defaultDomains } = emailData
      const domains = domain ? [domain] : defaultDomains
      const randomName = names[Math.floor(Math.random() * names.length)]
      const randomDomain = domains[Math.floor(Math.random() * domains.length)]
      setEmail(`${randomName}${Math.floor(Math.random() * 1000)}@${randomDomain}`)
    } catch (error) {
      console.error("Error generating email:", error)
      onCopy("Error generating email")
    }
  }

  const copyToClipboard = () => {
    if (email) {
      navigator.clipboard.writeText(email)
      onCopy(t("emailCopied"))
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
      <Input value={email} readOnly />
      <Button variant="outline" className="w-full bg-transparent" onClick={copyToClipboard}>
        {t("copyToClipboard")}
      </Button>
    </div>
  )
}
