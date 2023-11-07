import { LinearProgress } from "@mui/joy"

const LoadingPage = () => {
    return (
        <div className="grid place-items-center w-full h-screen">
            <div className="flex flex-col items-center">
                <LinearProgress />
                <span className="mt-2 text-gray-300 dark:text-neutral-700 font-bold text-2xl">Loading 載入中...</span>
            </div>
        </div>
    )
}

export default LoadingPage;