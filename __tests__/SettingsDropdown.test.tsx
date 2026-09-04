import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import FadelyTextUI from "../components/FadelyTextUI"

function openSettings() {
  const settingsButton = screen.getByRole("button", { name: "Settings" })
  fireEvent.click(settingsButton)
  return settingsButton
}

describe("SettingsDropdown", () => {
  it("keeps the language options hidden until the settings button is clicked", () => {
    render(<FadelyTextUI />)
    expect(screen.queryByRole("menu", { name: "Settings" })).not.toBeInTheDocument()

    openSettings()

    expect(screen.getByRole("menu", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: "English" })).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: "Turkish" })).toBeInTheDocument()
  })

  it("toggles closed when the settings button is clicked again", () => {
    render(<FadelyTextUI />)
    const settingsButton = openSettings()
    expect(screen.getByRole("menu", { name: "Settings" })).toBeInTheDocument()

    fireEvent.click(settingsButton)

    expect(screen.queryByRole("menu", { name: "Settings" })).not.toBeInTheDocument()
  })

  it("switches the UI language from the dropdown and closes it", () => {
    render(<FadelyTextUI />)
    openSettings()

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Turkish" }))

    // Dropdown closes and the whole UI re-renders in Turkish.
    expect(screen.queryByRole("menu", { name: "Ayarlar" })).not.toBeInTheDocument()
    expect(screen.getByText("Metin Üret")).toBeInTheDocument()
  })

  it("marks the active language as checked", () => {
    render(<FadelyTextUI />)
    openSettings()

    expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("menuitemradio", { name: "Turkish" })).toHaveAttribute("aria-checked", "false")
  })

  it("closes on Escape", () => {
    render(<FadelyTextUI />)
    openSettings()
    expect(screen.getByRole("menu", { name: "Settings" })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByRole("menu", { name: "Settings" })).not.toBeInTheDocument()
  })

  it("closes on outside click", () => {
    render(<FadelyTextUI />)
    openSettings()
    expect(screen.getByRole("menu", { name: "Settings" })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole("menu", { name: "Settings" })).not.toBeInTheDocument()
  })
})
