// File: components/ui/CreatableCombobox.tsx (CORRECTED)
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CreatableComboboxProps {
  options: { value: string; label: string }[]
  value?: string // Made optional to support react-hook-form
  onChange: (value: string) => void
  onCreate: (value: string) => void
  placeholder?: string
  emptyMessage?: string
}

export function CreatableCombobox({
  options, value, onChange, onCreate, placeholder = "Select an option...", emptyMessage = "No option found.",
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleCreate = () => {
    if (inputValue.trim() === "") return; // Don't create empty names
    onCreate(inputValue)
    setInputValue("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value ? options.find((option) => option.value === value)?.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          {/* ✨ THIS IS THE CORRECTED LINE ✨ */}
          {/* We now explicitly control the value of the input */}
          <CommandInput 
            placeholder="Search or type to create..." 
            value={inputValue} 
            onValueChange={setInputValue} 
          />
          <CommandList>
            <CommandEmpty
                // Disable the button if nothing is typed
                className={!inputValue.trim() ? "text-muted-foreground" : ""}
            >
                <button 
                    type="button"
                    disabled={!inputValue.trim()}
                    onClick={handleCreate} 
                    className="w-full text-left p-2 text-sm hover:bg-accent rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create "{inputValue}"
                </button>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value)
                    setInputValue("")
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}