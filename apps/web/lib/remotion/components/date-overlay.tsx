"use client";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Format ISO date string to "Jan 2024" */
const formatDate = (iso: string) => {
  const d = new Date(iso);
  const month = MONTH_NAMES[d.getUTCMonth()] ?? "???";
  return `${month} ${d.getUTCFullYear()}`;
};

interface DateOverlayProps {
  date: string;
}

/** Displays formatted date, positioned bottom-left of parent */
export function DateOverlay({ date }: DateOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: 20,
        color: "rgba(255,255,255,0.8)",
        fontFamily: "monospace",
        fontSize: 20,
        fontWeight: "bold",
        textShadow: "0 2px 4px rgba(0,0,0,0.6)",
      }}
    >
      {formatDate(date)}
    </div>
  );
}
