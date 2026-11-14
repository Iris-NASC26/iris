"use client";

import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Play, Pause, ChevronDown } from "lucide-react";
import { TIMELINE_MONTHS } from "./data/demoScenes";

interface EarthTimelineProps {
  selectedDate: string;
  isPlaying: boolean;
  playbackSpeed?: number;
  onDateChange: (date: string) => void;
  onTogglePlay: () => void;
}

export function EarthTimeline({
  selectedDate,
  isPlaying,
  playbackSpeed = 1.0,
  onDateChange,
  onTogglePlay,
}: EarthTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentIndex = Math.max(0, TIMELINE_MONTHS.indexOf(selectedDate));
  const progressPercent = (currentIndex / Math.max(1, TIMELINE_MONTHS.length - 1)) * 100;

  // Key milestone tick indices (every 12 months for Jan of each year)
  const milestoneIndices = [0, 12, 24, 36, 48, 60, 72, 83];

  const updateFromPosition = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = relativeX / rect.width;
      const index = Math.round(ratio * (TIMELINE_MONTHS.length - 1));
      const targetMonth = TIMELINE_MONTHS[index];
      if (targetMonth && targetMonth !== selectedDate) {
        onDateChange(targetMonth);
      }
    },
    [onDateChange, selectedDate]
  );

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    updateFromPosition(e.clientX);
  };

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isScrubbing) {
        updateFromPosition(e.clientX);
      }
    }
    function handleMouseUp() {
      setIsScrubbing(false);
    }

    if (isScrubbing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, updateFromPosition]);

  // Automated playback timer based on playbackSpeed
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(120, Math.round(650 / playbackSpeed));
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % TIMELINE_MONTHS.length;
      onDateChange(TIMELINE_MONTHS[nextIndex]);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, onDateChange, playbackSpeed]);

  return (
    <footer aria-label="Environmental Change Timeline" className="iris-timeline-dock">
      {/* Play/Pause Button */}
      <button
        aria-label={isPlaying ? "Pause timeline animation" : "Play timeline animation"}
        className="iris-play-btn"
        onClick={onTogglePlay}
        type="button"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />}
      </button>

      {/* Selected Month Indicator with Dropdown */}
      <div style={{ position: "relative" }}>
        <button
          aria-expanded={dropdownOpen}
          className="iris-date-selector"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          type="button"
        >
          <span>{selectedDate}</span>
          <ChevronDown size={14} style={{ opacity: 0.8 }} />
        </button>

        {dropdownOpen && (
          <div
            className="iris-flyout-panel"
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
              left: 0,
              width: "220px",
              maxHeight: "260px",
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {TIMELINE_MONTHS.map((m) => (
              <button
                key={m}
                onClick={() => {
                  onDateChange(m);
                  setDropdownOpen(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "6px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "none",
                  background: m === selectedDate ? "rgba(19, 224, 192, 0.16)" : "transparent",
                  color: m === selectedDate ? "var(--iris-accent-bright)" : "var(--iris-text-primary)",
                  cursor: "pointer",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Start Year Label */}
      <span className="iris-timeline-endpoint">Jan 2018</span>

      {/* Interactive Scrubbing Track */}
      <div
        className="iris-timeline-track-wrapper"
        onMouseDown={handleMouseDown}
        ref={trackRef}
      >
        <div className="iris-timeline-rail">
          {/* Active Highlight Fill */}
          <div
            className="iris-timeline-fill"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Key Milestone Dots */}
          {milestoneIndices.map((idx) => {
            const pct = (idx / Math.max(1, TIMELINE_MONTHS.length - 1)) * 100;
            const isPassed = idx <= currentIndex;
            return (
              <div
                key={idx}
                className={`iris-timeline-dot ${isPassed ? "active" : ""}`}
                style={{ left: `${pct}%` }}
              />
            );
          })}

          {/* Draggable Scrubber Thumb */}
          <div
            className="iris-timeline-thumb"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* End Year Label */}
      <span className="iris-timeline-endpoint">Dec 2024</span>
    </footer>
  );
}
