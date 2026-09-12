import { useState } from "react";
import { Viewer } from "@react-pdf-viewer/core";
import { Worker } from "@react-pdf-viewer/core";
import { ScrollArea } from "@radix-ui/react-scroll-area";

import "@react-pdf-viewer/core/lib/styles/index.css";
import packageJson from "../../../package.json";
import useDictionary from "@/dictionaries/useDictionary";

const pdfjsVersion = packageJson.dependencies["pdfjs-dist"];

const PDFViewer = ({ file }: { file: string }) => {
  const [error, setError] = useState<string | null>(null);
  const dict = useDictionary();

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-destructive mb-2">{dict.course.details.pdf_load_failed}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 px-4 py-2 bg-info text-info-foreground rounded-md hover:bg-info/90"
          >
            {dict.common.try_again}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Worker
      workerUrl={`https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`}
    >
      <ScrollArea className="max-h-screen overflow-y-auto">
        <Viewer fileUrl={file} />
      </ScrollArea>
    </Worker>
  );
};

export default PDFViewer;
