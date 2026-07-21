"use client";

import { useState } from "react";

export interface DeliveryOption {
  label: string;
  value: string; // e.g. "1", "3", "7"
}

interface DeliveryFilterProps {
  availableDeliveryOptions?: DeliveryOption[];
  selectedDeliveryTime?: string; // e.g., "1", "3", "7", or "Any"
  onSelectDeliveryTime?: (deliveryTime: string) => void;
}

const FALLBACK_DELIVERY_OPTIONS: DeliveryOption[] = [
  { label: "Express (24 Hours)", value: "1" },
  { label: "Up to 3 Days", value: "3" },
  { label: "Up to 7 Days", value: "7" },
];

export default function DeliveryFilter({
  availableDeliveryOptions = FALLBACK_DELIVERY_OPTIONS,
  selectedDeliveryTime: controlledSelected,
  onSelectDeliveryTime,
}: DeliveryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Local state fallback for standalone UI testing
  const [localSelected, setLocalSelected] = useState<string>("Any");

  const isControlled = controlledSelected !== undefined;
  const currentSelected = isControlled ? controlledSelected : localSelected;

  const isAnyTimeChecked = !currentSelected || currentSelected === "Any";

  const optionsToDisplay =
    availableDeliveryOptions.length > 0
      ? availableDeliveryOptions
      : FALLBACK_DELIVERY_OPTIONS;

  const handleSelect = (value: string) => {
    if (onSelectDeliveryTime) {
      onSelectDeliveryTime(value);
    }

    if (!isControlled) {
      setLocalSelected(value);
    }
  };

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
      <button
        className="filter-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="delivery-filter-content"
      >
        Delivery Time{" "}
        <i
          className={`fas fa-chevron-down ${isOpen ? "rotate" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div id="delivery-filter-content" className="filter-dropdown-content">
        <div className="vertical-stack">
          <label className="any-delivery-label">
            <input
              type="checkbox"
              id="delivery-any"
              aria-label="Any Time"
              checked={isAnyTimeChecked}
              onChange={() => handleSelect("Any")}
            />
            <strong>Any Time</strong>
          </label>

          {optionsToDisplay.map((opt) => (
            <label key={opt.value}>
              <input
                type="checkbox"
                className="delivery-option"
                value={opt.value}
                aria-label={opt.label}
                checked={!isAnyTimeChecked && currentSelected === opt.value}
                onChange={() => handleSelect(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}