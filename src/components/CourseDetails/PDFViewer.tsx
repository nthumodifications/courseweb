'use client';
import { SpecialZoomLevel, Viewer } from '@react-pdf-viewer/core';
import { Worker } from '@react-pdf-viewer/core';
import {Button} from '@/components/ui/button';
import {DownloadCloud} from 'lucide-react';
import Link from 'next/link';

import '@react-pdf-viewer/core/lib/styles/index.css';
import { ScrollArea } from '@radix-ui/react-scroll-area';

const PDFViewer = ({ file }: { file: string }) => {
    return <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <ScrollArea className='max-h-screen overflow-y-auto'>
            <Viewer fileUrl={file} />
        </ScrollArea>
    </Worker>
}

export default PDFViewer;