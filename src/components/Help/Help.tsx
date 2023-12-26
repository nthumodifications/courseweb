'use client'

import { ChevronRight, ChevronLeft, HelpCircle } from "lucide-react"
import useDictionary from "@/dictionaries/useDictionary"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/scomponents/ui/dialog"
import { Button } from "@/scomponents/ui/button"

import Intro from './Intro'
import Courses from './Courses'
import Dashboard from './Dashboard'
import Bus from './Bus'
import Tools from './Tools'
import Dev from './Dev'

const Help = () => {

  const pages = [
    <Intro />, <Courses />, <Dashboard />, <Bus />, <Tools />, <Dev />
  ]

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const dict = useDictionary();

  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem("hasVisitedBefore");
    if (!hasVisitedBefore) {
      setOpen(true);
    }
  }, []);

  const handleOpen = () => {
    setOpen(true)
    setPage(0)
  }

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem("hasVisitedBefore", "mhm");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>  
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex gap-1" onClick={handleOpen}>
          <HelpCircle size="16" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent>
        {pages[page]}
        <DialogFooter className="sm:justify-between flex-col">
          <Button variant="ghost" className="flex gap-1" disabled={page == 0} onClick={() => {setPage(page - 1)}}>
            <ChevronLeft size="16" /> {dict.help.prev}
          </Button>

          {page != pages.length - 1 ?
          <Button variant="ghost" className="flex gap-1" onClick={() => {setPage(page + 1)}}>
            {dict.help.next} <ChevronRight size="16" />
          </Button>
          :
          <Button variant="ghost" className="flex gap-1" onClick={handleClose}>
            {dict.help.jump} <ChevronRight size="16" />
          </Button>
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default Help;