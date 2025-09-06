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

    // Replace @/lib/utils imports with relative path
    if (content.includes('from "@/lib/utils"')) {
      content = content.replace(
        /from "@\/lib\/utils"/g,
        'from "../../lib/utils"',
      );
      updated = true;
    }

    // Replace other common @/ imports that might exist
    if (content.includes('from "@/components/')) {
      content = content.replace(/from "@\/components\//g, 'from "../');
      updated = true;
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
const uiSrcPath = path.join(__dirname, "../../../packages/ui/src");

if (fs.existsSync(uiSrcPath)) {
  console.log("Updating import paths in UI components...");
  updateImportsInDirectory(uiSrcPath);
  console.log("Import path updates complete!");
} else {
  console.error("UI package source directory not found:", uiSrcPath);
}
