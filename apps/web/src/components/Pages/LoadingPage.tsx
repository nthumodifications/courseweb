import useDictionary from "@/dictionaries/useDictionary";

const LoadingPage = () => {
  const dict = useDictionary();
  return (
    <div className="grid place-items-center w-full h-screen">
      <div className="flex flex-col items-center">
        {/* tailwind animate-pulse bar */}
        <span className="mt-2 text-muted-foreground  font-bold text-xl">
          {dict.common.loading}
        </span>
        <div className="h-2 w-36 bg-muted  rounded-full mt-4 animate-pulse"></div>
      </div>
    </div>
  );
};

export default LoadingPage;
