import { Chip, IconButton } from "@mui/joy";
import { GitHub, Mail } from "react-feather";
import FullLogo from "./Branding/FullLogo";

const Footer = () => {
    return (
        <footer className="hidden md:grid w-screen dark:bg-neutral-800 bg-neutral-50 p-6 rounded-lg shadow-lg grid-cols-2">
            <div className="">
                <h1 className="font-bold text-3xl flex flex-row space-x-3 mb-2"><FullLogo/> <Chip variant="outlined">ALPHA</Chip></h1>
                <p className="text-gray-600 dark:text-gray-400">Made with ❤️ by students for students</p>
                <div className="py-2">
                <p className="text-xs text-gray-600 dark:text-gray-400">We desperately need more contributers, join us if you're interested</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">就是你！我們很需要你加入我們，讓這個平臺更加完善！</p>
                </div>
                {/* Github */}
                <IconButton component="a" href="https://github.com/nthumodifications/courseweb">
                    <GitHub/>
                </IconButton>
                <IconButton component="a" href="mailto:chewtzihwee@gmail.com" target='_blank'>
                    <Mail/>
                </IconButton>
            </div>
            <div className="">
            </div>
        </footer>
    );
}

export default Footer;