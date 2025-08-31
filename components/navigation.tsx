"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Sun, Moon, ArrowRight } from "lucide-react"
import { useTheme } from "next-themes"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    setMounted(true)
    const handleClickOutside = (event: MouseEvent) => {
      const nav = document.getElementById("mobile-nav")
      const button = document.getElementById("mobile-menu-button")

      if (
        isMenuOpen &&
        nav &&
        button &&
        !nav.contains(event.target as Node) &&
        !button.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <nav className="sticky top-4 z-50 w-full">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background/80 backdrop-blur-md shadow-md">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
          {/* Logo and App Name */}
          <div className="flex items-center space-x-3">
            {/* light icon */}
            <Image
              src="/icon-light.png"
              alt="CAPlayground icon"
              width={32}
              height={32}
              className="rounded-lg block dark:hidden"
              priority
            />
            {/* dark icon */}
            <Image
              src="/icon-dark.png"
              alt="CAPlayground icon"
              width={32}
              height={32}
              className="rounded-lg hidden dark:block"
            />
            <Link
              href="/"
              className="font-helvetica-neue text-xl font-bold text-foreground hover:text-accent transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              CAPlayground
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href="https://sandbox-escape.github.io/capdocs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-accent transition-colors"
            >
              Docs
            </a>
            <Link href="/contributors" className="text-foreground hover:text-accent transition-colors">
              Contributors
            </Link>
            <Link href="/projects">
              <Button variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Projects <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full h-9 w-9 p-0"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-button"
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          id="mobile-nav"
          className={`mx-auto max-w-4xl overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-b-2xl border border-t-0 border-border bg-background/95 backdrop-blur-sm shadow-md">
            <div className="flex flex-col space-y-1 py-2">
              <a
                href="https://sandbox-escape.github.io/capdocs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-accent hover:bg-muted/50 transition-all duration-200 py-3 px-6 rounded-lg mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Docs
              </a>
              <Link
                href="/contributors"
                className="text-foreground hover:text-accent hover:bg-muted/50 transition-all duration-200 py-3 px-6 rounded-lg mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Contributors
              </Link>
              <div className="px-2 pt-2 pb-3">
                <Link href="/projects" onClick={() => setIsMenuOpen(false)}>
                  <Button
                    variant="default"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold w-full"
                  >
                    Projects <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="px-1 pb-3">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark")
                    setIsMenuOpen(false)
                  }}
                >
                  {mounted && theme === "dark" ? (
                    <>
                      <Sun className="h-5 w-5 mr-2" /> Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-5 w-5 mr-2" /> Dark Mode
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </nav>
  )
}
