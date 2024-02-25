'use client';
import {
    QueryClient,
    QueryClientProvider,
  } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            networkMode: 'offlineFirst',
        }
    }
})
  
const ReactQuery = ({ children }: PropsWithChildren) => {
    return <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
}

export default ReactQuery;