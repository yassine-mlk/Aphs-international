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
  
  // Protection robuste contre les données invalides
  const safeOptions = React.useMemo(() => {
    if (!options || !Array.isArray(options)) {
      return [];
    }
    return options.filter(option => option && typeof option === 'object' && option.value && option.label);
  }, [options]);
  
  const safeSelected = React.useMemo(() => {
    if (!selected || !Array.isArray(selected)) {
      return [];
    }
    return selected.filter(item => typeof item === 'string');
  }, [selected]);

  const handleUnselect = React.useCallback((value: string) => {
    if (typeof onChange === 'function') {
      const newSelected = safeSelected.filter((item) => item !== value);
      onChange(newSelected);
    }
  }, [safeSelected, onChange]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input && typeof onChange === 'function') {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "" && safeSelected.length > 0) {
            const newSelected = safeSelected.slice(0, -1);
            onChange(newSelected);
          }
        }
        // Prevent propagation for CommandPrimitive
        if (input.value !== "") {
          e.stopPropagation();
        }
      }
    },
    [inputRef, onChange, safeSelected]
  );

  const selectedOptions = React.useMemo(() => {
    return safeSelected.map(
      (value) => safeOptions.find((option) => option.value === value) || { value, label: value }
    );
  }, [safeSelected, safeOptions]);

  const filteredOptions = React.useMemo(() => {
    return safeOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(inputValue.toLowerCase()) &&
        !safeSelected.includes(option.value)
    );
  }, [safeOptions, inputValue, safeSelected]);

  const handleSelect = React.useCallback((optionValue: string) => {
    if (typeof onChange === 'function') {
      const newSelected = [...safeSelected, optionValue];
      onChange(newSelected);
      setInputValue("");
    }
  }, [safeSelected, onChange]);

  // Si les données ne sont pas encore chargées, afficher un état de chargement
  if (!options || !selected) {
    return (
      <div className={`border border-input px-3 py-2 text-sm rounded-md text-gray-500 ${className}`}>
        Chargement...
      </div>
    );
  }

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={`overflow-visible bg-transparent ${className || ''}`}
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
            placeholder={safeSelected.length === 0 ? placeholder : ""}
            className="ml-1 bg-transparent flex-1 outline-none text-sm"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
            <CommandGroup className="h-full overflow-auto p-1 max-h-[300px]">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => handleSelect(option.value)}
                    className="text-sm"
                  >
                    {option.label}
                  </CommandItem>
                ))
              ) : (
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