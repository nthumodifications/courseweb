import { Github, Mail, Instagram, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import FullLogo from "./Branding/FullLogo"
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo"
import Link from "next/link"

const Footer = () => {
  return (
    <footer className="hidden md:grid w-screen py-16 grid-cols-2">
      <div className="">

        <div className="flex gap-4">
          <NTHUModsLogo/>
          <div className="flex flex-col">
            <FullLogo/>
            <p className="text-muted-foreground text-sm">Made with ❤️ by students for students</p>
          </div>
        </div>

        <div className="py-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">We desperately need more contributers, join us if you're interested</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">就是你！我們很需要你加入我們，讓這個平臺更加完善！</p>
        </div>

        <Button variant="ghost" size="icon" asChild>
          <Link target="_blank" href="https://github.com/nthumodifications/courseweb">
            <Github/>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link target="_blank" href="mailto:nthumods@gmail.com">
            <Mail/>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link target="_blank" href="https://www.instagram.com/nthumods">
            <Instagram />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link target="_blank" href="https://facebook.com/nthumods">
            <Facebook />
          </Link>
        </Button>

      </div>
    </footer>
  );
}

export default Footer;