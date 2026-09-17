"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/useTranslation"
import { copyTextToClipboard } from "@/lib/clipboard"
import { generatePhoneNumber, getPhoneCountry, phoneCountries, formatPhoneForDisplay } from "@/data/phone-data"

interface PhoneNumberGeneratorProps {
  language: "en" | "tr"
  onCopy: (message: string) => void
}

export function PhoneNumberGenerator({ language, onCopy }: PhoneNumberGeneratorProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [country, setCountry] = useState(phoneCountries[0])
  const { t } = useTranslation(language)

  const generateForCountry = (nextCountry = country) => {
    try {
      const e164 = generatePhoneNumber(nextCountry)
      setPhoneNumber(formatPhoneForDisplay(nextCountry, e164))
    } catch (error) {
      console.error("Error generating phone number:", error)
      onCopy("Error generating phone number")
    }
  }

  const generatePhoneNumberHandler = () => {
    generateForCountry()
  }

  const copyToClipboard = async () => {
    if (phoneNumber) {
      const ok = await copyTextToClipboard(phoneNumber)
      onCopy(t(ok ? "phoneNumberCopied" : "copyFailed"))
    } else {
      onCopy(t("noPhoneNumberToCopy"))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Label htmlFor="country-select">{t("country")}</Label>
        <Select
          value={country.code}
          onValueChange={(value) => {
            const nextCountry = getPhoneCountry(value)
            setCountry(nextCountry)
            // Regenerate immediately if a number is already shown,
            // so switching country visibly changes the output.
            if (phoneNumber) {
              setPhoneNumber(formatPhoneForDisplay(nextCountry, generatePhoneNumber(nextCountry)))
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("selectCountry")} />
          </SelectTrigger>
          <SelectContent>
            {phoneCountries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name} ({c.phoneCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={generatePhoneNumberHandler} className="w-full">
        {t("generatePhoneNumber")}
      </Button>
      <Label htmlFor="generated-phone" className="sr-only">{t("phone")}</Label>
      <Input id="generated-phone" value={phoneNumber} readOnly aria-label={t("phone")} />
      <Button variant="outline" className="w-full bg-transparent" onClick={copyToClipboard}>
        {t("copyToClipboard")}
      </Button>
    </div>
  )
}
