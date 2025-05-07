import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

export type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  id?: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  id,
  options,
  selected,
  onChange,
  placeholder = "Sélectionner...",
  className,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "" && selected.length > 0) {
            onChange(selected.slice(0, -1));
          }
        }
        // Prevent propagation for CommandPrimitive
        if (input.value !== "") {
          e.stopPropagation();
        }
      }
    },
    [inputRef, onChange, selected]
  );

  const selectedOptions = selected.map(
    (value) => options.find((option) => option.value === value) || { value, label: value }
  );

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={`overflow-visible bg-transparent ${className}`}
    >
      <div
        id={id}
        className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      >
        <div className="flex gap-1 flex-wrap">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="rounded-sm px-1 py-0 text-xs"
            >
              {option.label}
              <button
                type="button"
                className="ml-1 rounded-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleUnselect(option.value)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="ml-1 bg-transparent flex-1 outline-none text-sm"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
            <CommandGroup className="h-full overflow-auto p-1 max-h-[300px]">
              {options.length > 0 ? (
                options
                  .filter(
                    (option) =>
                      option.label.toLowerCase().includes(inputValue.toLowerCase()) &&
                      !selected.includes(option.value)
                  )
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        onChange([...selected, option.value]);
                        setInputValue("");
                      }}
                      className={"text-sm"}
                    >
                      {option.label}
                    </CommandItem>
                  ))
              ) : (
                <p className="p-2 text-center text-sm text-muted-foreground">
                  Aucun résultat.
                </p>
              )}
              {options.length > 0 &&
                options.filter((option) =>
                  option.label.toLowerCase().includes(inputValue.toLowerCase()) &&
                  !selected.includes(option.value)
                ).length === 0 && (
                  <p className="p-2 text-center text-sm text-muted-foreground">
                    Aucun résultat.
                  </p>
                )}
            </CommandGroup>
          </div>
        )}
      </div>
    </Command>
  );
} 