"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SliderProps = {
  className?: string
  min?: number
  max?: number
  step?: number
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  onValueCommit?: (value: number[]) => void
} & Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "min" | "max" | "step">

function Slider({
  className,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  ...rest
}: SliderProps) {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = Number(e.target.value)
    onValueChange?.([v])
  }

  const handleCommit = () => {
    const el = inputRef.current
    if (!el) return
    const v = Number(el.value)
    onValueCommit?.([v])
  }

  const inputRef = React.useRef<HTMLInputElement | null>(null)

  return (
    <div
      data-slot="slider"
      className={cn("relative flex w-full items-center select-none", className)}
    >
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Array.isArray(value) ? value[0] : undefined}
        defaultValue={Array.isArray(defaultValue) ? defaultValue[0] : undefined}
        onChange={handleChange}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        className={cn(
          "w-full h-1.5 rounded-full bg-muted appearance-none outline-none",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary",
          "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:background [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary"
        )}
        {...rest}
      />
    </div>
  )
}

export { Slider }
