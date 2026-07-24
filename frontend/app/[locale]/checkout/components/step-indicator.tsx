"use client";

interface StepIndicatorProps {
  sections: readonly string[];
  expandedSections: string[];
  city: string;
  name: string;
  email: string;
  phone: string;
  deliveryType: string;
  deliveryBranch: string;
  isSelfReceiver: boolean;
  receiverName: string;
  receiverPhone: string;
}

export function StepIndicator({
  sections,
  expandedSections,
  city,
  name,
  email,
  phone,
  deliveryType,
  deliveryBranch,
  isSelfReceiver,
  receiverName,
  receiverPhone,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {sections.map((section, idx) => {
        const isFilled =
          section === "city"
            ? !!city
            : section === "info"
              ? !!(name && email && phone)
              : section === "delivery"
                ? !!(deliveryBranch || deliveryType === "pickup")
                : section === "receiver"
                  ? !!(isSelfReceiver || (receiverName && receiverPhone))
                  : section === "confirmation" || section === "comment"
                    ? true
                    : false;

        return (
          <div key={section} className="flex items-center gap-1">
            <div
              className={`size-2 rounded-full transition-colors ${
                isFilled
                  ? "bg-primary"
                  : expandedSections.includes(section)
                    ? "bg-primary/50"
                    : "bg-muted-foreground/20"
              }`}
            />
            {idx < sections.length - 1 && (
              <div className="w-3 h-px bg-muted-foreground/20" />
            )}
          </div>
        );
      })}
    </div>
  );
}
