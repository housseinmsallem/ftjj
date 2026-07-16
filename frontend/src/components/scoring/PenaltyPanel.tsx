import React from "react";

interface Props {
  onAddPenalty?: (side: "red" | "blue", value: number) => void;
  onAddStalling?: (side: "red" | "blue", value: number) => void;
  disabled?: boolean;
  locked?: boolean;
}

interface Option {
  value: number;
  label: string;
  severity: string;
}

const PENALTY_OPTIONS: Option[] = [
  { value: 1, label: "+1 Pénalité", severity: "low" },
  { value: 2, label: "+2 Pénalités", severity: "medium" },
];

const STALLING_OPTIONS: Option[] = [
  { value: 1, label: "Stalling +1", severity: "low" },
  { value: 2, label: "Stalling +2", severity: "medium" },
];

export default function PenaltyPanel({
  onAddPenalty,
  onAddStalling,
  disabled = false,
  locked = false,
}: Props) {
  const handlePenalty = (side: "red" | "blue", value: number) => {
    if (!locked && !disabled && onAddPenalty) {
      onAddPenalty(side, value);
    }
  };

  const handleStalling = (side: "red" | "blue", value: number) => {
    if (!locked && !disabled && onAddStalling) {
      onAddStalling(side, value);
    }
  };

  return (
    <div className="penalty-panel card">
      <h3>Pénalités & Stalling</h3>

      <div className="penalty-section">
        <h4 className="section-subtitle">Pénalités</h4>
        <div className="scoring-columns">
          <div className="scoring-col red-col">
            <h5 className="col-label red-label">🔴 Rouge</h5>
            {PENALTY_OPTIONS.map((opt) => (
              <button
                key={`pen-red-${opt.value}`}
                className="btn btn-scoring btn-penalty btn-red"
                onClick={() => handlePenalty("red", opt.value)}
                disabled={locked || disabled}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="scoring-col blue-col">
            <h5 className="col-label blue-label">🔵 Bleu</h5>
            {PENALTY_OPTIONS.map((opt) => (
              <button
                key={`pen-blue-${opt.value}`}
                className="btn btn-scoring btn-penalty btn-blue"
                onClick={() => handlePenalty("blue", opt.value)}
                disabled={locked || disabled}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="penalty-section">
        <h4 className="section-subtitle">Stalling (Passivité)</h4>
        <div className="scoring-columns">
          <div className="scoring-col red-col">
            <h5 className="col-label red-label">🔴 Rouge</h5>
            {STALLING_OPTIONS.map((opt) => (
              <button
                key={`stall-red-${opt.value}`}
                className="btn btn-scoring btn-stalling btn-red"
                onClick={() => handleStalling("red", opt.value)}
                disabled={locked || disabled}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="scoring-col blue-col">
            <h5 className="col-label blue-label">🔵 Bleu</h5>
            {STALLING_OPTIONS.map((opt) => (
              <button
                key={`stall-blue-${opt.value}`}
                className="btn btn-scoring btn-stalling btn-blue"
                onClick={() => handleStalling("blue", opt.value)}
                disabled={locked || disabled}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
