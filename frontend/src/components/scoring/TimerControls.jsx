import React from "react";

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function TimerControls({
  remainingSeconds = 0,
  durationSeconds = 300,
  timerState = "idle",
  status = "waiting",
  onStart,
  onPause,
  onResume,
  onDoctorTime,
  onWaitingTime,
  onFinish,
  isValidated = false,
  disabled = false,
}) {
  const isRunning = timerState === "running" && status === "live";
  const isPaused = timerState === "paused" || status === "paused";
  const isFinished = timerState === "finished" || status === "finished";
  const isIdle = timerState === "idle" && status === "waiting";
  const isDoctorTime = timerState === "doctor_time";
  const isWaitingTime = timerState === "waiting_time";

  const locked = isValidated || disabled;
  const progressPercent =
    durationSeconds > 0
      ? Math.max(
          0,
          Math.min(
            100,
            ((durationSeconds - remainingSeconds) / durationSeconds) * 100,
          ),
        )
      : 0;

  let timerLabel = "Prêt";
  if (isRunning) timerLabel = "En cours";
  if (isPaused) timerLabel = "Pause";
  if (isFinished) timerLabel = "Terminé";
  if (isDoctorTime) timerLabel = "Temps médecin";
  if (isWaitingTime) timerLabel = "Temps d'attente";

  let timeColor = "#e2e8f0";
  if (isRunning) timeColor = "#48bb78";
  if (isPaused) timeColor = "#ecc94b";
  if (isFinished) timeColor = "#fc8181";
  if (remainingSeconds <= 30 && isRunning) timeColor = "#fc8181";

  return (
    <div className="timer-controls card">
      <h3>Chronomètre</h3>

      <div className="timer-display" style={{ borderColor: timeColor }}>
        <span className="timer-value" style={{ color: timeColor }}>
          {formatTime(remainingSeconds)}
        </span>
        <span className="timer-label">{timerLabel}</span>
      </div>

      <div className="timer-progress-bar">
        <div
          className="timer-progress-fill"
          style={{ width: `${progressPercent}%`, background: timeColor }}
        />
      </div>

      <div className="timer-actions">
        {isIdle && !locked && (
          <button className="btn btn-success btn-lg" onClick={onStart}>
            ▶ Démarrer
          </button>
        )}

        {isRunning && !locked && (
          <button className="btn btn-warning" onClick={onPause}>
            ⏸ Pause
          </button>
        )}

        {isPaused && !locked && (
          <>
            <button className="btn btn-success" onClick={onResume}>
              ▶ Reprendre
            </button>
            <button className="btn btn-danger" onClick={onFinish}>
              ⏹ Terminer
            </button>
          </>
        )}

        {isRunning && !locked && (
          <>
            <button className="btn btn-outline" onClick={onDoctorTime}>
              🩺 Temps médecin
            </button>
            <button className="btn btn-outline" onClick={onWaitingTime}>
              ⏳ Temps d'attente
            </button>
            <button className="btn btn-danger" onClick={onFinish}>
              ⏹ Terminer
            </button>
          </>
        )}

        {(isDoctorTime || isWaitingTime) && !locked && (
          <>
            <button className="btn btn-success" onClick={onResume}>
              ▶ Reprendre
            </button>
            <button className="btn btn-danger" onClick={onFinish}>
              ⏹ Terminer
            </button>
          </>
        )}

        {isFinished && !locked && (
          <p className="muted finished-note">
            Combat terminé — en attente de validation
          </p>
        )}
        {locked && (
          <p className="muted finished-note">Session validée et verrouillée</p>
        )}
      </div>

      {!locked && (
        <div className="timer-presets">
          <small className="muted">Préréglages</small>
          <div className="preset-row">
            {[60, 120, 180, 240, 300, 360, 420, 600].map((sec) => (
              <button
                key={sec}
                className="preset-chip"
                onClick={() => {
                  if (onStart) onStart();
                }}
                disabled={!isIdle}
              >
                {formatTime(sec)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
