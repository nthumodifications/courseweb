import { IconButton } from "@mui/joy";
import { GitHub } from "react-feather";

const Footer = () => {
    return (
        <footer className="hidden md:grid w-screen bg-fuchsia-50 p-6 rounded-lg shadow-lg grid-cols-2">
            <div className="">
                <h1 className="font-bold text-3xl">NTHUMods</h1>
                <p className="text-gray-600">Made with ❤️ by students for students</p>
                {/* Github */}
                <IconButton component="a" href="https://github.com/nthumodifications/courseweb">
                    <GitHub/>
                </IconButton>
            </div>
            <div className="">
            </div>
        </footer>
    );
}

export default Footer;