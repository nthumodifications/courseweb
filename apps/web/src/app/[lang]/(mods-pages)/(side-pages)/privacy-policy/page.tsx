import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const PrivacyPolicyPage = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-4 px-4">
      <article className="flex flex-col gap-4 leading-relaxed">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">{dict.privacy_page.title}</h1>
          <p className="text-sm text-muted-foreground">
            {dict.privacy_page.updated_at}
          </p>
        </div>
        <p>{dict.privacy_page.intro}</p>
        {dict.privacy_page.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-4">
            <h2 className="text-base font-bold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items.length > 0 && (
              <ul className="list-disc pl-4 flex flex-col gap-2">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {dict.privacy_page.translation_note && (
          <p>{dict.privacy_page.translation_note}</p>
        )}
      </article>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
