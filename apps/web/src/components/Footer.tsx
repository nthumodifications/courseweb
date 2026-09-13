import { Github, Mail, Instagram, Facebook } from "lucide-react";
import { Button } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
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
    <div className="py-4 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between">
        <div className="flex gap-4">
          <div className="-translate-y-1">
            <NTHUModsLogo />
          </div>
          <div className="flex flex-col gap-1">
            <FullLogo />
            <p className="text-muted-foreground text-xs leading-relaxed">
              {dict.footer.tagline}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a
              target="_blank"
              href="https://github.com/nthumodifications/courseweb"
            >
              <Github size="20" className="text-muted-foreground" />
            </a>
          </Button>
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a target="_blank" href="mailto:nthumods@gmail.com">
              <Mail size="20" className="text-muted-foreground" />
            </a>
          </Button>
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a target="_blank" href="https://www.instagram.com/nthumods">
              <Instagram size="20" className="text-muted-foreground" />
            </a>
          </Button>
          <Button className="h-8 w-8" variant="ghost" size="icon" asChild>
            <a target="_blank" href="https://facebook.com/nthumods">
              <Facebook size="20" className="text-muted-foreground" />
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-row text-muted-foreground text-sm [&>a]:mr-4 [&>a]:w-max flex-wrap">
        <Link to={`/${routeLang}/contribute`}>{dict.footer.contribute}</Link>
        <Link to={`/${routeLang}/issues`}>{dict.footer.report_issue}</Link>
        <Link to={`/${routeLang}/team`}>{dict.footer.team}</Link>
        <Link to={`/${routeLang}/recruit`}>{dict.recruit.footer_link}</Link>
        <Link to={`/${routeLang}/privacy-policy`}>
          {dict.footer.privacy_policy}
        </Link>
        <Link to={`/${routeLang}/changelog`}>{dict.changelog.title}</Link>
        <Link to={`/${routeLang}/proxy-login`}>{dict.footer.proxy_login}</Link>
        <Link to={`/${routeLang}/design-system`}>
          {dict.footer.design_system}
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs leading-relaxed">
          © {getYear(Date.now())} NTHUMods. {dict.footer.copyright}
        </p>
        <p className="text-muted-foreground text-xs">
          {dict.footer.disclaimer}
        </p>
      </div>
    </div>
  );
};

export default Footer;
