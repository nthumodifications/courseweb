import useDictionary from "@/dictionaries/useDictionary";

export const AISLoading = () => {
  const dict = useDictionary();

  return (
    <div className="w-full grid place-items-center h-[--content-height]">
      <div className="flex flex-col space-y-4 items-center">
        {/* <div className='animate-spin rounded-full h-16 w-16 border-2 border-border'></div> */}
        <svg
          className="animate-spin h-14 w-14 text-foreground "
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-0"
            cx="12"
            cy="12"
            r="12"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        <p className="text-foreground ">
          {dict.pages.ais_loading}
        </p>
      </div>
    </div>
  );
};
