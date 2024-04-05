import {useState} from "react";
import {useHeadlessAIS} from "@/hooks/contexts/useHeadlessAIS";
import {Box, LinearProgress} from "@mui/joy";
import {AISNotLoggedIn} from "@/components/Pages/AISNotLoggedIn";
import {AISError} from "@/components/Pages/AISError";
import {AISLoading} from "@/components/Pages/AISLoading";

const DownloadIndicator = ({loaded, total}: {loaded: number, total: number}) => {
    const formatFilesize = (value: number) => {
        let magnitude = "B";
        if (value > 1024 * 1024 * 1024) {
            magnitude = "GB";
            value /= 1024 * 1024 * 1024;
        } else if (value > 1024 * 1024) {
            magnitude = "MB";
            value /= 1024 * 1024;
        } else if (value > 1024) {
            magnitude = "KB";
            value /= 1024;
        }
        return `${value.toFixed(2)} ${magnitude}`;
    }

    return <div className="flex flex-row items-center">
        下載中...
        <Box className="w-32 m-2"><LinearProgress size="lg" determinate={true} value={total == 0 ? 0 : (loaded / total * 100)}/></Box>
        {`(${formatFilesize(loaded)}/${formatFilesize(total)})`}
    </div>
}

const DownloadLink = ({text, url, filename}: {
    text: string,
    url: string,
    filename: string
}) => {
    const {initializing, getOauthCookies, oauth, loading, error: aisError} = useHeadlessAIS();
    const [clicked, setClicked] = useState(false);
    const [loadedBytes, setLoadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);

    const getAttachment = async () => {
        if (!oauth.enabled) return
        const download_api = await fetch(`/api/ais_headless/eeclass/download?cookie=${encodeURIComponent(oauth.eeclassCookie!)}&url=${encodeURIComponent(url)}`);
        if (!download_api.ok) return

        const contentType = download_api.headers.get('content-type')!;
        const contentLength = download_api.headers.get('content-length')!;
        const total = parseInt(contentLength, 10);
        setTotalBytes(total);

        let loaded = 0;
        const res = new Response(new ReadableStream({
            async start(controller) {
                const reader = download_api.body!.getReader();
                for (; ;) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    loaded += value.byteLength;
                    setLoadedBytes(loaded);
                    controller.enqueue(value);
                }
                controller.close();
            },
        }));
        const blob = new Blob([await res.blob()], {type: contentType});

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename.replace(".", "-");
        link.click();
        link.remove();
    }


    if (!oauth.enabled || aisError || loading) return <div></div>

    return <div
        className="text-blue-300 cursor-pointer"
        onClick={async () => { //
            setClicked(true);
            await getAttachment();
            setClicked(false);
        }}>{clicked ? <DownloadIndicator loaded={loadedBytes} total={totalBytes}/> : text}</div>
}

export default DownloadLink;