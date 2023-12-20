'use client';
import { NextPage } from "next";
import { Modal, ModalDialog, ModalClose, Typography, Box, Button } from "@mui/joy";
import { useState } from "react";
import { ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';

const ClassPlanning = async () => {
  return (
    <>
      <span className="font-bold text-2xl">Class planning</span>
      <span className="">Plan your classes ahead and view upcoming classes.</span>
    </>
  )
}

const CourseDatabase = async () => {
  return (
    <>
      <span className="font-bold text-2xl">Course database</span>
      <span className="">View venue and content of all classes with other details.</span>
      <div className="mt-4">
        <Button component="a" target="_blank" href="https://nthumods.com/zh/courses" color="neutral" variant="outlined" startDecorator={<ExternalLink />}>
          Select classes now
        </Button>
      </div>
    </>
  )
}

const BusTimetable = async () => {
  return (
    <>
      <span className="font-bold text-2xl">Bus timetable</span>
      <span className="">Get realtime information on current bus timetables.</span>
    </>
  )
}

const MoreFunctions = async () => {
  return (
    <>
      <span className="font-bold text-2xl">More functions?</span>
      <span className="">Connect you NTHU account to gain access to even more epic features.</span>
      <div className="mt-4">
        <Button href="#" color="neutral" variant="outlined" startDecorator={<ExternalLink />}>
          Connect now
        </Button>
      </div>
    </>
  )
}
 
const Tutorial: NextPage = async () => {
  const [open, setOpen] = useState(true);

  const pages = [
    { img: "/images/upcoming.gif", content: <ClassPlanning /> },
    { img: "/images/list.gif", content: <CourseDatabase /> },
    { img: "/images/bus.gif", content: <BusTimetable /> },
    { img: "/images/toolbox.gif", content: <MoreFunctions /> }
  ]

  const [page, setPage] = useState(0)

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <ModalDialog className="flex flex-col items-center w-[400px]">
        <img src={pages[page].img} className="w-48 h-48"/>
        <div className="w-full flex flex-col py-4">
          {pages[page].content}
        </div>
        <div className="w-full flex justify-between">
          <Button disabled={page == 0} startDecorator={<ChevronLeft />} color="neutral" variant="plain" onClick={() => {
            setPage(page - 1)
          }}>
            Prev
          </Button>
          {page != pages.length - 1 ?
          <Button endDecorator={<ChevronRight />} color="neutral" variant="plain" onClick={() => {
            setPage(page + 1)
          }}>
            Next
          </Button>
          :
          <Button component="a" href="https://nthumods.com/zh/today" endDecorator={<ChevronRight />} color="primary" variant="solid">
            Jump in
          </Button>}
        </div>
      </ModalDialog>
    </Modal>
  )
}

export default Tutorial;