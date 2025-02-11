"use client";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { MinimalCourse } from "@/types/courses";
import React, { ReactNode } from "react";

const CCXPSyllabusLink = ({
  course,
  children,
}: {
  course: MinimalCourse;
  children: ReactNode;
}) => {
  const { getACIXSTORE } = useHeadlessAIS();
  const [ACIXSTORE, setACIXSTORE] = React.useState<string | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const fetchACIXSTORE = async () => {
      const token = await getACIXSTORE();
      setACIXSTORE(token);
    };
    fetchACIXSTORE();
  }, [getACIXSTORE]);

  const syllabusLink = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/common/Syllabus/1.php?ACIXSTORE=${ACIXSTORE}&c_key=${course.raw_id}`;
  // override child href and target props
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(
        child as React.ReactElement<HTMLAnchorElement>,
        {
          href: syllabusLink,
          target: "_blank",
        },
      );
    }
    return child;
  });

  return <>{ACIXSTORE ? childrenWithProps : <></>}</>;
};

export default CCXPSyllabusLink;
