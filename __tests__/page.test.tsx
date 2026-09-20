import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import Home from "../app/page"

describe("Home page", () => {
  it("renders the DataFill UI", () => {
    render(<Home />)
    expect(screen.getByText("DataFill")).toBeInTheDocument()
    expect(screen.getByText("Generate Text")).toBeInTheDocument()
  })
})
