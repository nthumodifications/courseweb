'use client';;
import { Viewer } from '@react-pdf-viewer/core';
import { Worker } from '@react-pdf-viewer/core';
import { ScrollArea } from '@radix-ui/react-scroll-area';

import '@react-pdf-viewer/core/lib/styles/index.css';

const PDFViewer = ({ file }: { file: string }) => {
    return <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <ScrollArea className='max-h-screen overflow-y-auto'>
            <Viewer fileUrl={file} />
        </ScrollArea>
    </Worker>
}

export default PDFViewer;