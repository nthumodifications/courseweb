import { Github, Mail, Instagram, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import FullLogo from "./Branding/FullLogo"
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo"
import Link from "next/link"

const Footer = () => {
  return <div className="py-16 flex flex-col gap-1">
    <div className="flex gap-3">
      <div className="-translate-y-1">
        <NTHUModsLogo/>
      </div>
      <div className="flex flex-col">
        <FullLogo/>
        <p className="text-muted-foreground text-xs">Made with ❤️ by students for students</p>
      </div>
    </div>
    <div className="flex gap-2">
      <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
        <Link target="_blank" href="https://github.com/nthumodifications/courseweb">
          <Github size="20" className="text-muted-foreground"/>
        </Link>
      </Button>
      <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
        <Link target="_blank" href="mailto:nthumods@gmail.com">
          <Mail size="20" className="text-muted-foreground"/>
        </Link>
      </Button>
      <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
        <Link target="_blank" href="https://www.instagram.com/nthumods">
          <Instagram size="20" className="text-muted-foreground"/>
        </Link>
      </Button>
      <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
        <Link target="_blank" href="https://facebook.com/nthumods">
          <Facebook size="20" className="text-muted-foreground"/>
        </Link>
      </Button>
    </div>
  </div>
}

export default Footer;