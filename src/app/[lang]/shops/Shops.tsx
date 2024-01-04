'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useState, useEffect } from 'react'

const Shops = ({ data }) => {

  return (
    <div className="grid md:grid-cols-[1fr_200px] gap-6 p-6">
      <div className="flex flex-col gap-4">
        {data.map(({ area, image, name, note, phone, schedule }, index) => 
          <div key={name || index}>
            <Card>
              <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardDescription>{area}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Card Content</p>
              </CardContent>
              <CardFooter>
                <p>Card Footer</p>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 w-[200px]">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Location</span>
          
        </div>
      </div>
    </div>
  )
}

export default Shops