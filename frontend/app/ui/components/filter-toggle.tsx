import { Filter, X } from "lucide-react";
import { Button } from "~/ui/primitives/button";

interface FilterToggleButtonProps {
  show: boolean;
  onToggle: () => void;
}

export function FilterToggleButton({ show, onToggle }: FilterToggleButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onToggle}>
      {show ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
      {show ? "Закрити" : "Фільтр"}
    </Button>
  );
}
