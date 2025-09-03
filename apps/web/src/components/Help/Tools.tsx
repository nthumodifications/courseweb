import useDictionary from "@/dictionaries/useDictionary";
import LoginDialog from "@/components/Forms/LoginDialog";

const Tools = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/toolbox.gif" className="w-48 h-48" alt="toolbox" />
      </div>
      <span className="font-bold text-2xl">{dict.help.tools.title}</span>
      <span className="">{dict.help.tools.description}</span>
      <div>
        {/* <CCXPDownAlert/> */}
        <LoginDialog />
      </div>
    </div>
  );
};

export default Tools;
