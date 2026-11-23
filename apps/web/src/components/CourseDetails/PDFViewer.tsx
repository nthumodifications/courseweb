import { useState } from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Button, ErrorState } from "@courseweb/ui";

import "@react-pdf-viewer/core/lib/styles/index.css";
// Served from our own origin, built from the installed pdfjs-dist, so the
// worker always matches the library version and no third-party CDN can change
// the code that parses the PDF.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import useDictionary from "@/dictionaries/useDictionary";
import { hardenPdfDocumentParams } from "./pdfDocumentParams";

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
    <Worker workerUrl={pdfWorkerUrl}>
      <ScrollArea className="max-h-screen overflow-y-auto">
        <Viewer
          fileUrl={file}
          transformGetDocumentParams={hardenPdfDocumentParams}
        />
      </ScrollArea>
    </Worker>
  );
};

export default PDFViewer;
