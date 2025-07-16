"use client"

import * as React from "react"
import { ArrowDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const ScrollButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    const [isAtBottom, setIsAtBottom] = React.useState(true)

    React.useEffect(() => {
        const handleScroll = () => {
            const scrollable = document.documentElement
            const isAtBottom = scrollable.scrollHeight - scrollable.scrollTop <= scrollable.clientHeight + 1
            setIsAtBottom(isAtBottom)
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        handleScroll() 

        return () => {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [])
    
    const scrollToBottom = () => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth"
        })
    }

    return (
        <Button
            ref={ref}
            onClick={scrollToBottom}
            className={cn(
                "absolute bottom-20 right-4 z-10 h-10 w-10 rounded-full p-2 transition-opacity",
                isAtBottom ? "opacity-0" : "opacity-100",
                className
            )}
            {...props}
        >
            <ArrowDown />
        </Button>
    )
})
ScrollButton.displayName = "ScrollButton"


export { ScrollButton } 