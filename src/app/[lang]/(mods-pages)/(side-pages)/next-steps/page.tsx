const NextStepsZH = () => {
  return (
    <div>
      <h1>下一步</h1>
      <p>这是一个页面</p>
    </div>
  );
};

const NextStepsEN = () => {
  return (
    <div>
      <h1>Next Steps</h1>
      <p>This is a page</p>
    </div>
  );
};

type LangProps = {
  params: {
    lang: string;
  };
};

export default function NextSteps({ params: { lang } }: LangProps) {
  return <>{lang === "zh" ? <NextStepsZH /> : <NextStepsEN />}</>;
}
