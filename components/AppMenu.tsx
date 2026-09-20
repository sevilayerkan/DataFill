"use client"

import { useEffect, useRef, useState } from "react"
import {
  AtSign,
  Binary,
  Briefcase,
  Building2,
  Calendar,
  Car,
  CreditCard,
  Database,
  Eraser,
  FileDiff,
  Fingerprint,
  Hash,
  IdCard,
  KeyRound,
  Landmark,
  Link2,
  ListOrdered,
  Mail,
  MapPin,
  Menu,
  Network,
  Palette,
  Phone,
  Pilcrow,
  Receipt,
  Type,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation, type Language } from "@/hooks/useTranslation"
import type { ToolId } from "@/lib/text-tools"
import type { DataType as MiscDataType } from "@/components/MiscGenerator"

export type MainTab = "generate" | "counter" | "misc" | "dataset" | "tools"

interface AppMenuProps {
  language: Language
  activeTab: MainTab
  activeMiscType: MiscDataType
  activeTool: ToolId
  onNavigateTab: (tab: MainTab) => void
  onNavigateMisc: (type: MiscDataType) => void
  onNavigateTool: (tool: ToolId) => void
}

const MISC_ICONS: Record<MiscDataType, typeof User> = {
  fullName: User,
  email: Mail,
  address: MapPin,
  password: KeyRound,
  phone: Phone,
  uuid: Fingerprint,
  date: Calendar,
  tckn: IdCard,
  iban: Landmark,
  vkn: Receipt,
  plate: Car,
  username: AtSign,
  company: Building2,
  jobTitle: Briefcase,
  creditCard: CreditCard,
  slug: Link2,
  color: Palette,
  ipv4: Network,
  ipv6: Network,
  mac: Network,
  coordinates: MapPin,
  hash: Hash,
  barcode: Binary,
  boolean: Pilcrow,
  sentence: Type,
  paragraph: Type,
}

const MISC_LABEL_KEYS = {
  fullName: "miscFullName",
  email: "miscEmail",
  address: "miscAddress",
  password: "miscPassword",
  phone: "miscPhone",
  uuid: "miscUuid",
  date: "miscDate",
  tckn: "miscTckn",
  iban: "miscIban",
  vkn: "miscVkn",
  plate: "miscPlate",
  username: "miscUsername",
  company: "miscCompany",
  jobTitle: "miscJobTitle",
  creditCard: "miscCreditCard",
  slug: "miscSlug",
  color: "miscColor",
  ipv4: "miscIpv4",
  ipv6: "miscIpv6",
  mac: "miscMac",
  coordinates: "miscCoordinates",
  hash: "miscHash",
  barcode: "miscBarcode",
  boolean: "miscBoolean",
  sentence: "miscSentence",
  paragraph: "miscParagraph",
} as const

const TOOL_ITEMS: { id: ToolId; labelKey: "toolsCaseTitle" | "toolsLinesTitle" | "toolsWsTitle" | "toolsB64Title" | "toolsDiffTitle"; Icon: typeof Type }[] = [
  { id: "case", labelKey: "toolsCaseTitle", Icon: Type },
  { id: "lines", labelKey: "toolsLinesTitle", Icon: ListOrdered },
  { id: "ws", labelKey: "toolsWsTitle", Icon: Eraser },
  { id: "b64", labelKey: "toolsB64Title", Icon: Binary },
  { id: "diff", labelKey: "toolsDiffTitle", Icon: FileDiff },
]

const MISC_TYPES: MiscDataType[] = [
  "fullName", "email", "address", "password", "phone", "uuid", "date",
  "tckn", "iban", "vkn", "plate", "username", "company", "jobTitle",
  "creditCard", "slug", "color", "ipv4", "ipv6", "mac", "coordinates",
  "hash", "barcode", "boolean", "sentence", "paragraph",
]

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-1">
      <h3 className="px-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-0">
        {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  )
}

export function AppMenu({
  language,
  activeTab,
  activeMiscType,
  activeTool,
  onNavigateTab,
  onNavigateMisc,
  onNavigateTool,
}: AppMenuProps) {
  const { t } = useTranslation(language)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        menuButtonRef.current?.focus()
        return
      }
      if (event.key === "Tab") {
        const panel = panelRef.current
        if (!panel) return
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null || el === document.activeElement)
        if (focusable.length === 0) {
          event.preventDefault()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocusedRef.current?.focus?.()
    }
  }, [open ])

  const go = (fn: () => void) => () => {
    fn()
    setOpen(false)
  }

  const itemClass = (isActive: boolean) =>
    `flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${
      isActive ? "bg-accent font-medium text-accent-foreground" : "text-foreground/90"
    }`

  return (
    <>
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        type="button"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="app-menu-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={t("menuAllFeatures")}>
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            id="app-menu-panel"
            className="absolute left-0 top-0 flex h-full w-[19rem] max-w-[85vw] flex-col border-r bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <p className="text-sm font-semibold tracking-tight">{t("menuAllFeatures")}</p>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="icon"
                type="button"
                aria-label={t("closeMenu")}
                onClick={() => setOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <nav aria-label={t("menuAllFeatures")} className="flex-1 space-y-2 overflow-y-auto px-2 py-3">
              <MenuSection title={t("menuMain")}>
                <li>
                  <button type="button" className={itemClass(activeTab === "generate")} onClick={go(() => onNavigateTab("generate"))} aria-current={activeTab === "generate" ? "page" : undefined}>
                    <Type className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{t("generate")}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">{t("menuGenerateDesc")}</span>
                    </span>
                  </button>
                </li>
                <li>
                  <button type="button" className={itemClass(activeTab === "counter")} onClick={go(() => onNavigateTab("counter"))} aria-current={activeTab === "counter" ? "page" : undefined}>
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{t("counter")}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">{t("menuCounterDesc")}</span>
                    </span>
                  </button>
                </li>
                <li>
                  <button type="button" className={itemClass(activeTab === "dataset")} onClick={go(() => onNavigateTab("dataset"))} aria-current={activeTab === "dataset" ? "page" : undefined}>
                    <Database className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{t("dataset")}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">{t("menuDatasetDesc")}</span>
                    </span>
                  </button>
                </li>
              </MenuSection>

              <MenuSection title={`${t("misc")} · ${t("menuGenerators")}`}>
                {MISC_TYPES.map((miscType) => {
                  const Icon = MISC_ICONS[miscType]
                  const isActive = activeTab === "misc" && activeMiscType === miscType
                  return (
                    <li key={miscType}>
                      <button
                        type="button"
                        className={itemClass(isActive)}
                        onClick={go(() => onNavigateMisc(miscType))}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{t(MISC_LABEL_KEYS[miscType])}</span>
                      </button>
                    </li>
                  )
                })}
              </MenuSection>

              <MenuSection title={`${t("tools")} · ${t("menuTextTools")}`}>
                {TOOL_ITEMS.map(({ id, labelKey, Icon }) => {
                  const isActive = activeTab === "tools" && activeTool === id
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={itemClass(isActive)}
                        onClick={go(() => onNavigateTool(id))}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{t(labelKey)}</span>
                      </button>
                    </li>
                  )
                })}
              </MenuSection>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
