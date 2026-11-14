"use client";

import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Play, Pause, ChevronDown } from "lucide-react";
import { TIMELINE_MONTHS } from "./data/demoScenes";

interface EarthTimelineProps {
  selectedDate: string;
  isPlaying: boolean;
  onDateChange: (date: string) => void;
  onTogglePlay: () => void;
}

export function EarthTimeline({
  selectedDate,
  isPlaying,
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

  // Automated playback timer (600ms per frame)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % TIMELINE_MONTHS.length;
      onDateChange(TIMELINE_MONTHS[nextIndex]);
    }, 650);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, onDateChange]);

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
          <ChevronDown size={16} />
        </button>

        {dropdownOpen && (
          <div
            className="iris-flyout-panel"
            style={{
              bottom: "60px",
              left: "0",
              width: "160px",
              maxHeight: "220px",
              overflowY: "auto",
              padding: "8px",
            }}
          >
            {["Jan 2018", "Jan 2020", "Jan 2022", "Jan 2024", "Jul 2024", "Dec 2024"].map((d) => (
              <button
                key={d}
                className="iris-quick-pill"
                style={{
                  height: "34px",
                  fontSize: "13px",
                  width: "100%",
                  justifyContent: "flex-start",
                  padding: "0 10px",
                  marginBottom: "4px",
                }}
                onClick={() => {
                  onDateChange(d);
                  setDropdownOpen(false);
                }}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Start Date */}
      <span className="iris-date-start-label">Jan 2018</span>

      {/* Timeline Interactive Track */}
      <div
        className="iris-timeline-track-wrap"
        onMouseDown={handleMouseDown}
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={TIMELINE_MONTHS.length - 1}
        aria-valuenow={currentIndex}
        aria-valuetext={selectedDate}
        tabIndex={0}
      >
        <div className="iris-timeline-track" />
        <div className="iris-timeline-progress" style={{ width: `${progressPercent}%` }} />

        {/* Milestone ticks */}
        <div className="iris-track-ticks">
          {milestoneIndices.map((idx) => {
            const isPassed = currentIndex >= idx;
            return <div key={idx} className={`iris-track-tick ${isPassed ? "active" : ""}`} />;
          })}
        </div>

        {/* Thumb */}
        <div
          className="iris-timeline-thumb"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Timeline End Date */}
      <span className="iris-date-end-label">Dec 2024</span>
    </footer>
  );
}
