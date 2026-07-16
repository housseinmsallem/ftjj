import React from "react";

interface Props {
  onAddAdvantage?: (side: "red" | "blue", value: number) => void;
  disabled?: boolean;
  locked?: boolean;
}

const ADVANTAGE_OPTIONS = [
  { value: 1, label: "+1 Avantage" },
  { value: 2, label: "+2 Avantages" },
];

export default function AdvantagePanel({
  onAddAdvantage,
  disabled = false,
  locked = false,
}: Props) {
  const handleAdvantage = (side: "red" | "blue", value: number) => {
    if (!locked && !disabled && onAddAdvantage) {
      onAddAdvantage(side, value);
    }
  };

  return (
    <div className="advantage-panel card">
      <h3>Avantages</h3>
      <div className="scoring-columns">
        <div className="scoring-col red-col">
          <h4 className="col-label red-label">🔴 Rouge</h4>
          {ADVANTAGE_OPTIONS.map((opt) => (
            <button
              key={`red-${opt.value}`}
              className="btn btn-scoring btn-red"
              onClick={() => handleAdvantage("red", opt.value)}
              disabled={locked || disabled}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="scoring-col blue-col">
          <h4 className="col-label blue-label">🔵 Bleu</h4>
          {ADVANTAGE_OPTIONS.map((opt) => (
            <button
              key={`blue-${opt.value}`}
              className="btn btn-scoring btn-blue"
              onClick={() => handleAdvantage("blue", opt.value)}
              disabled={locked || disabled}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
