'use client';
import { timetableColors } from "@/const/timetableColors";


export const TimetableThemePreview = ({ theme, onClick = () => { }, selected = false }: { theme: string; selected?: boolean; onClick?: () => void; }) => {
    return <div
        onClick={onClick}
        className={`flex flex-col rounded-lg p-3 hover:dark:bg-neutral-800 hover:bg-gray-100 transition cursor-pointer space-y-2 ${selected ? "bg-gray-100 dark:bg-neutral-800" : ""}`}>
        <div className="flex flex-row">
            {timetableColors[theme].map((color, index) => (
                <div className="flex-1 h-6 w-6" style={{ background: color }} key={index} />
            ))}
        </div>
        <span className="text-sm">{theme}</span>
    </div>;
};
