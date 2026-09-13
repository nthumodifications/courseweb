import { useState } from "react";
import { Viewer } from "@react-pdf-viewer/core";
import { Worker } from "@react-pdf-viewer/core";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Button, ErrorState } from "@courseweb/ui";

import "@react-pdf-viewer/core/lib/styles/index.css";
import packageJson from "../../../package.json";
import useDictionary from "@/dictionaries/useDictionary";

const pdfjsVersion = packageJson.dependencies["pdfjs-dist"];

const PDFViewer = ({ file }: { file: string }) => {
  const [error, setError] = useState<string | null>(null);
  const dict = useDictionary();

  if (error) {
    return (
      <ErrorState
        title={dict.course.details.pdf_load_failed}
        description={error}
        action={
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            {dict.common.try_again}
          </Button>
        }
      />
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
