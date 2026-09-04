"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "@/hooks/useTranslation"
import { addressData as enAddressData } from "@/data/en/address-data"
import { addressData as trAddressData } from "@/data/tr/address-data"

interface AddressGeneratorProps {
  language: "en" | "tr"
  onCopy: (message: string) => void
}

export function AddressGenerator({ language, onCopy }: AddressGeneratorProps) {
  const { t } = useTranslation(language)
  const [address, setAddress] = useState("")

  const generateAddress = () => {
    try {
      if (language === "tr") {
        const fullAddresses = (trAddressData as { fullAddresses?: string[] }).fullAddresses
        if (fullAddresses && fullAddresses.length > 0) {
          const picked = fullAddresses[Math.floor(Math.random() * fullAddresses.length)]
          setAddress(picked)
          return
        }

        // Fallback: JSON boşsa parça parça Türkçe formatında üret
        const { streets, cities } = trAddressData
        const districts = (trAddressData as { districts?: string[] }).districts ?? cities
        const number = Math.floor(Math.random() * 200) + 1
        const street = streets[Math.floor(Math.random() * streets.length)]
        const district = districts[Math.floor(Math.random() * districts.length)]
        const city = cities[Math.floor(Math.random() * cities.length)]
        setAddress(`${street} No: ${number}, ${district}, ${city}`)
        return
      }

      const { streets, cities, states } = enAddressData

      const number = Math.floor(Math.random() * 1000) + 1
      const street = streets[Math.floor(Math.random() * streets.length)]
      const city = cities[Math.floor(Math.random() * cities.length)]
      const state = states[Math.floor(Math.random() * states.length)]
      const zip = Math.floor(Math.random() * 90000) + 10000

      setAddress(`${number} ${street}\n${city}, ${state} ${zip}`)
    } catch (error) {
      console.error("Error generating address:", error)
      onCopy("Error generating address")
    }
  }

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      onCopy(t("addressCopied"))
    } else {
      onCopy(t("noAddressToCopy"))
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={generateAddress} className="w-full">
        {t("generateAddress")}
      </Button>
      <Textarea value={address} readOnly className="h-24" />
      <Button variant="outline" className="w-full bg-transparent" onClick={copyToClipboard}>
        {t("copyToClipboard")}
      </Button>
    </div>
  )
}
