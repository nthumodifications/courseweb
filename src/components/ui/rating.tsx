"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const ratingVariants = {
  default: {
    star: "text-foreground",
    emptyStar: "text-muted-foreground",
  },
  destructive: {
    star: "text-red-500",
    emptyStar: "text-red-200",
  },
  yellow: {
    star: "text-yellow-500",
    emptyStar: "text-yellow-200",
  },
};

interface RatingProps extends React.HTMLAttributes<HTMLDivElement> {
  rating: number;
  totalStars?: number;
  size?: number;
  fill?: boolean;
  Icon?: React.ReactElement;
  variant?: keyof typeof ratingVariants;
  onRatingChange?: (rating: number) => void;
  showText?: boolean; // Add showText prop
  disabled?: boolean;
}

export const Rating = ({
  rating: initialRating,
  totalStars = 5,
  size = 20,
  fill = true,
  Icon = <Star />,
  variant = "default",
  onRatingChange,
  showText = true, // Default to true if disabled prop is not provided
  disabled = false, // Default to false if disabled prop is not provided
  ...props
}: RatingProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [currentRating, setCurrentRating] = useState(initialRating);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      setIsHovering(true);
      const starIndex = parseInt(
        (event.currentTarget as HTMLDivElement).dataset.starIndex || "0",
      );
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverRating(null);
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      const starIndex = parseInt(
        (event.currentTarget as HTMLDivElement).dataset.starIndex || "0",
      );
      setCurrentRating(starIndex);
      setHoverRating(null);
      if (onRatingChange) {
        onRatingChange(starIndex);
      }
    }
  };

  const displayRating = disabled
    ? initialRating
    : (hoverRating ?? currentRating);
  const fullStars = Math.floor(displayRating);
  const partialStar =
    displayRating % 1 > 0 ? (
      <PartialStar
        fillPercentage={displayRating % 1}
        size={size}
        className={cn(ratingVariants[variant].star)}
        Icon={Icon}
      />
    ) : null;

  return (
    <div
      className={cn("flex w-fit flex-col gap-2", {
        "pointer-events-none": disabled,
      })}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="flex items-center" onMouseEnter={handleMouseEnter}>
        {[...Array(fullStars)].map((_, i) =>
          React.cloneElement(Icon, {
            key: i,
            size,
            className: cn(
              fill ? "fill-current stroke-1" : "fill-transparent",
              ratingVariants[variant].star,
            ),
            onClick: handleClick,
            onMouseEnter: handleMouseEnter,
            "data-star-index": i + 1,
          }),
        )}
        {partialStar}
        {[
          ...Array(Math.max(0, totalStars - fullStars - (partialStar ? 1 : 0))),
        ].map((_, i) =>
          React.cloneElement(Icon, {
            key: i + fullStars + 1,
            size,
            className: cn("stroke-1", ratingVariants[variant].emptyStar),
            onClick: handleClick,
            onMouseEnter: handleMouseEnter,
            "data-star-index": i + fullStars + 1,
          }),
        )}
      </div>
      {showText && (
        <span className="text-xs text-muted-foreground font-semibold">
          Current Rating: {`${currentRating}`}
        </span>
      )}
    </div>
  );
};

interface PartialStarProps {
  fillPercentage: number;
  size: number;
  className?: string;
  Icon: React.ReactElement;
}

const PartialStar = ({
  fillPercentage,
  size,
  className,
  Icon,
}: PartialStarProps) => {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {React.cloneElement(Icon, {
        size,
        className: cn("fill-transparent", className),
      })}
      <div
        style={{
          position: "absolute",
          top: 0,
          overflow: "hidden",
          width: `${fillPercentage * 100}%`,
        }}
      >
        {React.cloneElement(Icon, {
          size,
          className: cn("fill-current", className),
        })}
      </div>
    </div>
  );
};
