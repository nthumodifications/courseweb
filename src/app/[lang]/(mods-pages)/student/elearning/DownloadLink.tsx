import {useState} from "react";

const DownloadLink = ({text, onLinkClick}: { text: string, onLinkClick: () => Promise<void> }) => {
    const [clicked, setClicked] = useState(false)
    return <div
        className="text-blue-300 cursor-pointer"
        onClick={async () => {
            setClicked(true);
            await onLinkClick();
            setClicked(false);
        }}>{clicked ? "下載中..." : text}</div>
}

export default DownloadLink;