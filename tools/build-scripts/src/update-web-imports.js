const fs = require("fs");
const path = require("path");

function updateImportsInDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach((file) => {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      updateImportsInDirectory(filePath);
    } else if (
      file.isFile() &&
      (file.name.endsWith(".tsx") || file.name.endsWith(".ts"))
    ) {
      updateImportsInFile(filePath);
    }
  });
}

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let updated = false;

    // Replace @/components/ui/ imports with @courseweb/ui imports
    if (content.includes('from "@/components/ui/')) {
      content = content.replace(
        /from "@\/components\/ui\/([^"]+)"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace relative ./ui/ imports with @courseweb/ui imports
    if (content.includes('from "./ui/')) {
      content = content.replace(
        /from "\.\/ui\/([^"]+)"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace relative ../ui/ imports with @courseweb/ui imports
    if (content.includes('from "../ui/')) {
      content = content.replace(
        /from "\.\.\/ui\/([^"]+)"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace @/lib/utils imports with @courseweb/ui imports (since cn is exported from there)
    if (content.includes('from "@/lib/utils"')) {
      content = content.replace(
        /from "@\/lib\/utils"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace relative ./lib/utils imports with @courseweb/ui imports
    if (content.includes('from "./lib/utils"')) {
      content = content.replace(
        /from "\.\/lib\/utils"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace @/hooks/use-mobile imports with @courseweb/ui imports
    if (content.includes('from "@/hooks/use-mobile"')) {
      content = content.replace(
        /from "@\/hooks\/use-mobile"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace @/components/Animation/ imports with @courseweb/ui imports
    if (content.includes('from "@/components/Animation/')) {
      content = content.replace(
        /from "@\/components\/Animation\/([^"]+)"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace relative Animation imports
    if (content.includes('from "./Animation/')) {
      content = content.replace(
        /from "\.\/Animation\/([^"]+)"/g,
        'from "@courseweb/ui"',
      );
      updated = true;
    }

    // Fix default import issues for Animation components
    if (content.includes('import Fade from "@courseweb/ui"')) {
      content = content.replace(
        /import Fade from "@courseweb\/ui"/g,
        'import { Fade } from "@courseweb/ui"',
      );
      updated = true;
    }

    if (content.includes('import ButtonSpinner from "@courseweb/ui"')) {
      content = content.replace(
        /import ButtonSpinner from "@courseweb\/ui"/g,
        'import { ButtonSpinner } from "@courseweb/ui"',
      );
      updated = true;
    }

    // Replace lucide-react imports where they might conflict - add specific imports if needed
    if (
      content.includes("import { ") &&
      content.includes(' } from "lucide-react"')
    ) {
      // We'll leave lucide-react imports as-is since @courseweb/ui re-exports common icons
      // But we could optimize this later by using the re-exports from @courseweb/ui
    }

    if (updated) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Updated imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
  }
}

// Run the script
const webSrcPath = path.join(__dirname, "../../../apps/web/src");

if (fs.existsSync(webSrcPath)) {
  console.log("Updating import paths in web app components...");
  updateImportsInDirectory(webSrcPath);
  console.log("Import path updates complete!");
} else {
  console.error("Web app source directory not found:", webSrcPath);
}
