import Button from '@mui/joy/Button';

export default () => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/crane.gif" className="w-48 h-48" />
      </div>
      <span className="font-bold text-2xl">
        Growing together
      </span>
      <span className="">
        We're committed to continuous improvement to offer you the best possible experience. Please note that the app is still in development, and while we strive for perfection, there may be occasional hiccups along the way. We value your input extremely, share your ideas, feedback, and features you'd love to see.
      </span>
      <div>
        <Button component="a" target="_blank" href="https://forms.gle/LKYiVhLVwRGL44pz6">Give feedback</Button>
      </div>
    </div>
  )
}