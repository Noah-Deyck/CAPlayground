import Link from "next/link"
import Image from "next/image"
import { Github, Twitter, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-12 md:px-30 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="space-y-4">
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
              <span className="font-helvetica-neue text-xl font-bold">CAPlayground</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer.
            </p>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-heading font-semibold">Resources</h3>
            <div className="space-y-2">
              <Link href="/docs" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Documentation
              </Link>
              <Link href="/roadmap" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Roadmap
              </Link>
            </div>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="font-heading font-semibold">Community</h3>
            <div className="space-y-2">
              <Link
                href="/contributors"
                className="block text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Contributors
              </Link>
              <Link href="https://github.com/CAPlayground/CAPlayground" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                GitHub
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Discord
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">© 2025 CAPlayground. All rights reserved.</p>
            <div className="flex space-x-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
