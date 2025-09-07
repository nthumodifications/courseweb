import useDictionary from "@/dictionaries/useDictionary";

const Dashboard = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/upcoming.gif" className="w-48 h-48" />
      </div>
      <span className="font-bold text-2xl">{dict.help.dashboard.title}</span>
      <span className="">{dict.help.dashboard.description}</span>
    </div>
  );
};

export default Dashboard;
