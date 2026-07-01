import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MediaPicker from "@/components/admin/MediaPicker";

interface ImagePickerFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function ImagePickerField({
  value,
  onChange,
  label = "Image",
  placeholder = "https://...",
  className = ""
}: ImagePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      {label && <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>}
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 flex-grow"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-9 shrink-0"
        >
          Browse
        </Button>
      </div>
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        onPick={(m) => {
          onChange(m.url);
          setOpen(false);
        }}
        title={`Select ${label}`}
      />
    </div>
  );
}
