import { useState } from "react";
import { Viewer } from "@react-pdf-viewer/core";
import { Worker } from "@react-pdf-viewer/core";
import { ScrollArea } from "@radix-ui/react-scroll-area";

import "@react-pdf-viewer/core/lib/styles/index.css";
import packageJson from "../../../package.json";

const pdfjsVersion = packageJson.dependencies["pdfjs-dist"];

const PDFViewer = ({ file }: { file: string }) => {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-red-600 mb-2">Failed to load PDF</p>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
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
