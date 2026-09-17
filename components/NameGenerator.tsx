"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/useTranslation"
import { copyTextToClipboard } from "@/lib/clipboard"
import { nameData as enNameData } from "@/data/en/name-data"
import { nameData as trNameData } from "@/data/tr/name-data"

interface NameGeneratorProps {
  language: "en" | "tr"
  onCopy: (message: string) => void
}

export function NameGenerator({ language, onCopy }: NameGeneratorProps) {
  const { t } = useTranslation(language)
  const [name, setName] = useState("")
  const [gender, setGender] = useState("any")
  const [nameOrigin, setNameOrigin] = useState<"en" | "tr">("en")

  const generateName = () => {
    try {
      const nameData = nameOrigin === "tr" ? trNameData : enNameData
      const { maleNames, femaleNames, lastNames } = nameData

      let firstName
      if (gender === "male") {
        firstName = maleNames[Math.floor(Math.random() * maleNames.length)]
      } else if (gender === "female") {
        firstName = femaleNames[Math.floor(Math.random() * femaleNames.length)]
      } else {
        const allNames = [...maleNames, ...femaleNames]
        firstName = allNames[Math.floor(Math.random() * allNames.length)]
      }

      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      setName(`${firstName} ${lastName}`)
    } catch (error) {
      console.error("Error generating name:", error)
      onCopy("Error generating name")
    }
  }

  const copyToClipboard = async () => {
    if (name) {
      const ok = await copyTextToClipboard(name)
      onCopy(t(ok ? "nameCopied" : "copyFailed"))
    } else {
      onCopy(t("noNameToCopy"))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Label htmlFor="name-origin-select">{t("nameOrigin")}</Label>
        <Select value={nameOrigin} onValueChange={(value: "en" | "tr") => setNameOrigin(value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={t("selectNameOrigin")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t("english")}</SelectItem>
            <SelectItem value="tr">{t("turkish")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <RadioGroup value={gender} onValueChange={setGender}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="any" id="any" />
          <Label htmlFor="any">{t("any")}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="male" id="male" />
          <Label htmlFor="male">{t("male")}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="female" id="female" />
          <Label htmlFor="female">{t("female")}</Label>
        </div>
      </RadioGroup>
      <Button onClick={generateName} className="w-full">
        {t("generateName")}
      </Button>
      <Label htmlFor="generated-name" className="sr-only">{t("name")}</Label>
      <Input id="generated-name" value={name} readOnly aria-label={t("name")} />
      <Button variant="outline" className="w-full bg-transparent" onClick={copyToClipboard}>
        {t("copyToClipboard")}
      </Button>
    </div>
  )
}
