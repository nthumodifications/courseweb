'use client';
import { timetableColors } from "@/const/timetableColors";


export const TimetableThemePreview = ({ theme, onClick = () => { }, selected = false }: { theme: string; selected?: boolean; onClick?: () => void; }) => {
    return <div
        onClick={onClick}
        className={`flex flex-col rounded-sm p-2 hover:dark:bg-neutral-800 hover:bg-gray-50 transition cursor-pointer space-y-2 ${selected ? "border-border border" : ""}`}>
        <div className="flex flex-row">
            {timetableColors[theme].map((color, index) => (
                <div className="flex-1 h-4 w-4" style={{ background: color }} key={index} />
            ))}
        </div>
        <span className="text-sm capitalize">{theme}</span>
    </div>;
};
