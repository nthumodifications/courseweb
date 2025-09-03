const LoadingPage = () => {
  return (
    <div className="grid place-items-center w-full h-screen">
      <div className="flex flex-col items-center">
        {/* tailwind animate-pulse bar */}
        <span className="mt-2 text-gray-300 dark:text-neutral-700 font-bold text-xl">
          Loading 載入中...
        </span>
        <div className="h-2 w-36 bg-gray-300 dark:bg-neutral-700 rounded-full mt-4 animate-pulse"></div>
      </div>
    </div>
  );
};

export default LoadingPage;
