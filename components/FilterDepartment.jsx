"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { reviews } from "@/constants";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IoFilter } from "react-icons/io5";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

let allFrameworks = [];

reviews.forEach(
    (r, index) =>
        (allFrameworks[index] = {
            value: r.name,
            label: r.name,
        })
);

allFrameworks.push({
    value: "Video Editing",
    label: "Video Editing",
});

/**
 * FilterDepartment component.
 * @param {object} props
 * @param {function} props.filterFunc - Callback when department is selected.
 * @param {string[]|null} [props.allowedDepartments] - If provided, only show these departments. Null = show all.
 */
export default function FilterDepartment({ filterFunc, allowedDepartments }) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState("");

    // Filter frameworks list based on allowed departments (for dept_managers)
    const frameworks = React.useMemo(() => {
        if (!allowedDepartments || allowedDepartments.length === 0) {
            return allFrameworks;
        }
        return allFrameworks.filter((f) => allowedDepartments.includes(f.value));
    }, [allowedDepartments]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                >
                    {value ? (
                        frameworks.find(
                            (framework) => framework.value === value
                        )?.label
                    ) : (
                        <div className="flex gap-3 items-center justify-center">
                            <IoFilter />
                            Department
                        </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-0">
                <Command>
                    <CommandInput placeholder="Search department..." />
                    <CommandList>
                        <CommandEmpty>No department found.</CommandEmpty>
                        <CommandGroup>
                            {frameworks.map((framework) => (
                                <CommandItem
                                    key={framework.value}
                                    value={framework.value}
                                    onSelect={(currentValue) => {
                                        setValue(
                                            currentValue === value
                                                ? ""
                                                : currentValue
                                        );
                                        setOpen(false);
                                        filterFunc(currentValue);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === framework.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {framework.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
