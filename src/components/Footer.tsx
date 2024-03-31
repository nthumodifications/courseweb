import { Github, Mail, Instagram, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import FullLogo from "./Branding/FullLogo"
import Link from "next/link"

const Footer = () => {
  return (
    <footer className="hidden md:grid w-screen dark:bg-neutral-800 bg-neutral-50 p-6 rounded-lg shadow-lg grid-cols-2">
      <div className="text-center">

      <div className="bg-[url('https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/images/bottom_bg.png')] flex items-center justify-center w-full h-12 border-2 border-solid border-black">
      版權所有 © 2028 &nbsp;&nbsp; <FullLogo/> <br/>
      </div>
        
        <span className="font-bold">資訊安全政策 個資保護政策</span> <br/>
        
        <Button variant="ghost" size="icon" asChild>
          <Link target="_blank" href="https://github.com/nthumodifications/courseweb">
            <Github/>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link target="_blank" href="mailto:chewtzihwee@gmail.com">
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