'use client' // Error components must be Client Components
import * as Sentry from "@sentry/nextjs";
import { Alert, Box, Button, Typography } from '@mui/joy'
import { useEffect } from 'react'
import Link from "next/link";
import { AlertOctagon } from 'lucide-react';
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error)
  }, [error])
 
  return (
    <div className='h-screen w-full grid place-items-center'>
      <Alert
        variant="soft"
        color="danger"
        startDecorator={
          <AlertOctagon/>
        }
        sx={{ alignItems: 'flex-start', gap: '1rem' }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography level="title-md">Something went wrong</Typography>
          <pre className="text-xs text-gray-500">
            {error.message}
          </pre>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Link href="https://github.com/nthumodifications/courseweb/issues/new/choose">
              <Button variant="outlined" size="sm" color="danger">
                Report issue
              </Button>
            </Link>
            <Button 
              variant="solid" 
              size="sm" 
              color="danger"
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
              }>
              Try again
            </Button>
          </Box>
        </Box>
      </Alert>
    </div>
  )
}
