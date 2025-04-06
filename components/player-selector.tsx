"use client"

import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

export function PlayerSelector({ players, selectedPlayers, onSelectionChange }) {
  const togglePlayer = (player) => {
    if (selectedPlayers.includes(player)) {
      onSelectionChange(selectedPlayers.filter((p) => p !== player))
    } else {
      onSelectionChange([...selectedPlayers, player])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {selectedPlayers.map((player) => (
          <Badge key={player} variant="secondary" className="px-3 py-1">
            {player}
            <button className="ml-2 text-muted-foreground hover:text-foreground" onClick={() => togglePlayer(player)}>
              ×
            </button>
          </Badge>
        ))}
        {selectedPlayers.length === 0 && <p className="text-sm text-muted-foreground">No players selected</p>}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <span>Select players</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search players..." />
            <CommandList>
              <CommandEmpty>No players found</CommandEmpty>
              <CommandGroup>
                {players.map((player) => (
                  <CommandItem
                    key={player}
                    onSelect={() => togglePlayer(player)}
                    className="flex items-center justify-between"
                  >
                    <span>{player}</span>
                    {selectedPlayers.includes(player) && <Check className="h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {players.length > 0 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([])}
            disabled={selectedPlayers.length === 0}
          >
            Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([...players])}
            disabled={selectedPlayers.length === players.length}
          >
            Select All
          </Button>
        </div>
      )}
    </div>
  )
}

