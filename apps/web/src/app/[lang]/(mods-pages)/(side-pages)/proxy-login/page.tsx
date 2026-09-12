import { PageHeader, PageShell, Section } from "@courseweb/ui";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const linkClass = "text-primary underline-offset-4 hover:underline";

const useMermaid = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs";
      mermaid.initialize({startOnLoad: true});
      mermaid.contentLoaded();
    `;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
};

const ProxyLoginExplainerPage = () => {
  useMermaid();
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const routeLang = lang === "en" ? "en" : "zh";
  const copy = dict.proxy_login_page;
  const guidePath = `/${routeLang}/web-for-beginners`;

  return (
    <PageShell width="content">
      <PageHeader
        className="[&_h1]:overflow-visible [&_h1]:text-clip [&_h1]:whitespace-normal"
        title={
          <span className="text-4xl font-bold tracking-tight">
            {copy.title}
          </span>
        }
        description={copy.updated}
      />

      <Section title={copy.what.title}>
        <p className="max-w-prose text-sm">
          {copy.what.body_before}{" "}
          <Link className={linkClass} to={`${guidePath}/auth`}>
            {copy.what.link}
          </Link>
          {copy.what.body_after}
        </p>
      </Section>

      <div className="max-w-prose rounded-md bg-muted p-4 text-sm">
        <p>
          <strong>{copy.note.label}</strong> {copy.note.body_before}{" "}
          <Link className={linkClass} to={`${guidePath}/auth`}>
            {copy.note.link}
          </Link>
          {copy.note.body_after}
        </p>
      </div>

      <Section title={copy.features.title}>
        <p className="max-w-prose text-sm">{copy.features.intro}</p>
        <ul className="max-w-prose list-disc space-y-3 pl-4 text-sm">
          {copy.features.links.map((item) => (
            <li key={item.path}>
              <Link className={linkClass} to={`${guidePath}/${item.path}`}>
                {item.label}
              </Link>{" "}
              <span>— {item.description}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={copy.account.title}>
        <p className="max-w-prose text-sm">{copy.account.intro}</p>
        <ol className="max-w-prose list-decimal space-y-3 pl-4 text-sm">
          {copy.account.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="max-w-prose text-sm font-semibold">
          {copy.account.emphasis}
        </p>
      </Section>

      <Section title={copy.protection.title}>
        <p className="max-w-prose text-sm">{copy.protection.intro}</p>
        <ul className="max-w-prose list-disc space-y-3 pl-4 text-sm">
          {copy.protection.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3 className="text-base font-semibold">
          {copy.protection.flow_title}
        </h3>
        <div className="mermaid max-w-full overflow-x-auto rounded-md bg-muted p-4 text-sm">
          {copy.protection.flow}
        </div>
        <p className="max-w-prose text-sm">
          <Link className={linkClass} to={`${guidePath}/auth`}>
            {copy.protection.reference}
          </Link>
        </p>
      </Section>

      <Section title={copy.process.title}>
        <p className="max-w-prose text-sm">{copy.process.intro}</p>
        <div className="mermaid max-w-full overflow-x-auto rounded-md bg-muted p-4 text-sm">
          {copy.process.flow}
        </div>
        <p className="max-w-prose text-sm">
          <Link className={linkClass} to={`${guidePath}/auth`}>
            {copy.process.reference}
          </Link>
        </p>
      </Section>

      <Section title={copy.reauth.title}>
        <p className="max-w-prose text-sm">
          {copy.reauth.body_before}{" "}
          <Link className={linkClass} to={`${guidePath}/course`}>
            {copy.reauth.course}
          </Link>{" "}
          {copy.reauth.middle}{" "}
          <Link className={linkClass} to={`${guidePath}/grades`}>
            {copy.reauth.grades}
          </Link>
          {copy.reauth.body_after}
        </p>
      </Section>

      <Section title={copy.references.title}>
        <p className="max-w-prose text-sm">
          {copy.references.body_before}{" "}
          <a
            className={linkClass}
            href={copy.references.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.references.link}
          </a>
          .
        </p>
      </Section>

      <Footer />
    </PageShell>
  );
};

export default ProxyLoginExplainerPage;
