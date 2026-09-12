import { Github, Mail, Instagram, Facebook } from "lucide-react";
import { Button } from "@courseweb/ui";
import FullLogo from "./Branding/FullLogo";
import NTHUModsLogo from "./Branding/NTHUModsLogo";
import { Link, useParams } from "react-router-dom";
import { getYear } from "date-fns";
import useDictionary from "@/dictionaries/useDictionary";

const Footer = () => {
  const { lang } = useParams<{ lang: string }>();
  const dict = useDictionary();
  const routeLang = lang === "en" ? "en" : "zh";
  return (
    <footer className="flex flex-col space-y-6 border-t border-border pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="-translate-y-1">
            <NTHUModsLogo />
          </div>
          <div className="flex flex-col gap-1">
            <FullLogo />
            <p className="text-muted-foreground text-xs">
              {dict.footer.tagline}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/nthumodifications/courseweb"
            >
              <Github size="20" className="text-muted-foreground" />
            </a>
          </Button>
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="mailto:nthumods@gmail.com"
            >
              <Mail size="20" className="text-muted-foreground" />
            </a>
          </Button>
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.instagram.com/nthumods"
            >
              <Instagram size="20" className="text-muted-foreground" />
            </a>
          </Button>
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://facebook.com/nthumods"
            >
              <Facebook size="20" className="text-muted-foreground" />
            </a>
          </Button>
        </div>
      </div>

      <nav
        className="flex flex-wrap gap-x-4 gap-y-2 text-sm"
        aria-label={dict.footer.navigation}
      >
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/contribute`}
        >
          {dict.footer.contribute}
        </Link>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/issues`}
        >
          {dict.footer.report_issue}
        </Link>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/team`}
        >
          {dict.footer.team}
        </Link>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/recruit`}
        >
          {dict.recruit.footer_link}
        </Link>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/privacy-policy`}
        >
          {dict.footer.privacy_policy}
        </Link>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/changelog`}
        >
          {dict.changelog.title}
        </Link>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/proxy-login`}
        >
          {dict.footer.proxy_login}
        </Link>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={`/${routeLang}/design-system`}
        >
          {dict.footer.design_system}
        </Link>
      </nav>

      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          © {getYear(Date.now())} NTHUMods. {dict.footer.copyright}
        </p>
        <p className="text-muted-foreground text-xs">
          {dict.footer.disclaimer}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
