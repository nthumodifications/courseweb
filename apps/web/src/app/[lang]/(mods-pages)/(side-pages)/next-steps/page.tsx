import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const NextSteps = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-4 px-4">
      <article className="flex flex-col gap-4 leading-relaxed">
        <h1 className="text-xl font-bold">{dict.next_steps.title}</h1>
        {dict.next_steps.salutation && <p>{dict.next_steps.salutation}</p>}
        <p>{dict.next_steps.opening}</p>
        {dict.next_steps.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-4">
            <h2 className="text-base font-bold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        {dict.next_steps.closing.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className="text-right">{dict.next_steps.signature}</p>
      </article>
      <Footer />
    </div>
  );
};

export default NextSteps;
