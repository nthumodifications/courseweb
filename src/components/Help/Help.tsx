'use client';
import { Modal, ModalDialog, ModalClose, Typography, Box, Button } from "@mui/joy";
import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, ExternalLink, HelpCircle } from 'lucide-react';

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

  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem("hasVisitedBefore");
    if (!hasVisitedBefore) {
      setOpen(true);
      localStorage.setItem("hasVisitedBefore", "mhm");
    }
  }, []);

  return (<>
    <Button
      size="sm"
      color="neutral"
      variant="outlined"
      startDecorator={<HelpCircle size={16} />}
      onClick={() => {
        setOpen(true)
        setPage(0)
      }}
    >
      Help
    </Button>

    <Modal open={open} onClose={() => setOpen(false)}>
      <ModalDialog className="flex flex-col w-[400px]">
        <div>
          <Button color="neutral" variant="plain" size="sm" onClick={() => { setOpen(false) }}>
            Skip
          </Button>
        </div>
        {pages[page]}
        <div className="pt-8 w-full flex justify-between">
          <Button
            disabled={page == 0}
            startDecorator={<ChevronLeft />}
            color="neutral"
            variant="plain"
            onClick={() => {
              setPage(page - 1)
            }}
          >
            Prev
          </Button>

          {page != pages.length - 1 ?
          <Button
            endDecorator={<ChevronRight />}
            color="neutral"
            variant="plain"
            onClick={() => {
              setPage(page + 1)
            }}
          >
            Next
          </Button>
          :
          <Button
            endDecorator={<ChevronRight />}
            color="primary"
            variant="solid"
            onClick={() => {
              setOpen(false)
            }}
          >
            Jump in
          </Button>
          }

        </div>
      </ModalDialog>
    </Modal>
  </>)
}

export default Help;