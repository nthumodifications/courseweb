import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

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
  const language = lang === "en" ? "en" : "zh";

  return (
    <div className="flex flex-col gap-4 px-4">
      <article className="flex flex-col gap-4 leading-relaxed">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">{dict.proxy_login.title}</h1>
          <p className="text-sm text-muted-foreground">
            {dict.proxy_login.updated_at}
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold">
            {dict.proxy_login.what_is.title}
          </h2>
          <p>
            {dict.proxy_login.what_is.before_link}{" "}
            <a href={`/${language}/web-for-beginners/auth`}>
              {dict.proxy_login.what_is.link}
            </a>
            {dict.proxy_login.what_is.after_link}
          </p>
          <div className="border border-border p-4">
            <p className="text-sm">
              <strong>
                {dict.proxy_login.what_is.note_title}
                {dict.proxy_login.what_is.separator}
              </strong>{" "}
              {dict.proxy_login.what_is.note_before}{" "}
              <a href={`/${language}/web-for-beginners/auth`}>
                {dict.proxy_login.what_is.note_link}
              </a>{" "}
              {dict.proxy_login.what_is.note_after}
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold">
            {dict.proxy_login.connections.title}
          </h2>
          <p>{dict.proxy_login.connections.intro}</p>
          <ul className="list-disc pl-4 flex flex-col gap-2">
            {dict.proxy_login.connections.items.map((item) => (
              <li key={item.path}>
                <a href={`/${language}${item.path}`}>{item.label}</a>{" "}
                {dict.proxy_login.connections.separator} {item.description}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold">
            {dict.proxy_login.account.title}
          </h2>
          <p>{dict.proxy_login.account.intro}</p>
          <ol className="list-decimal pl-4 flex flex-col gap-2">
            {dict.proxy_login.account.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="font-bold">{dict.proxy_login.account.assurance}</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold">
            {dict.proxy_login.protection.title}
          </h2>
          <p>{dict.proxy_login.protection.intro}</p>
          <ul className="list-disc pl-4 flex flex-col gap-2">
            {dict.proxy_login.protection.items.map((item, index) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                {item.description && (
                  <>
                    {dict.proxy_login.protection.separator}
                    {item.description}
                  </>
                )}
                {index === 2 && (
                  <>
                    <div className="mermaid">
                      {dict.proxy_login.diagrams.password}
                    </div>
                    <p>
                      {dict.proxy_login.protection.detail_before}{" "}
                      <a href={`/${language}/web-for-beginners/auth`}>
                        {dict.proxy_login.protection.detail_link}
                      </a>
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold">
            {dict.proxy_login.process.title}
          </h2>
          <p>{dict.proxy_login.process.intro}</p>
          <div className="mermaid">{dict.proxy_login.diagrams.login}</div>
          <p>
            {dict.proxy_login.process.detail_before}{" "}
            <a href={`/${language}/web-for-beginners/auth`}>
              {dict.proxy_login.process.detail_link}
            </a>
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold">
            {dict.proxy_login.reauth.title}
          </h2>
          <p>
            {dict.proxy_login.reauth.before_course}{" "}
            <a href={`/${language}/web-for-beginners/course`}>
              {dict.proxy_login.reauth.course}
            </a>{" "}
            {dict.proxy_login.reauth.between}{" "}
            <a href={`/${language}/web-for-beginners/grades`}>
              {dict.proxy_login.reauth.grades}
            </a>
            {dict.proxy_login.reauth.after}
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold">
            {dict.proxy_login.references.title}
          </h2>
          <p>
            {dict.proxy_login.references.before}{" "}
            <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/headless_ais.ts">
              {dict.proxy_login.references.link}
            </a>
            {dict.proxy_login.references.after}
          </p>
        </section>
      </article>
      <Footer />
    </div>
  );
};

export default ProxyLoginExplainerPage;
