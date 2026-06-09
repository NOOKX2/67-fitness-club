"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WeightEntry } from "@/lib/data";
import { BRAND_BLUE, BRAND_BLUE_LIGHT } from "@/lib/brand";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 280;
const PADDING = { top: 24, right: 24, bottom: 48, left: 52 };
const ANIMATION_MS = 700;

type ChartPoint = { x: number; y: number; weight: number; day: number };
type ChartData = {
  yTicks: number[];
  yMin: number;
  yMax: number;
  plotHeight: number;
  points: ChartPoint[];
  linePath: string;
  areaPath: string;
  xLabels: Array<{ label: string; x: number }>;
};

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function getYTicks(min: number, max: number): number[] {
  if (min === max) {
    const center = min;
    return [center - 4, center - 2, center, center + 2, center + 4];
  }

  const range = max - min;
  const roughStep = range / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const step = Math.ceil(roughStep / magnitude) * magnitude || 1;
  const tickMin = Math.floor(min / step) * step;
  const tickMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];

  for (let value = tickMin; value <= tickMax + step * 0.01; value += step) {
    ticks.push(Number(value.toFixed(1)));
  }

  return ticks.length >= 2 ? ticks : [min, max];
}

function computeChart(weights: number[]): ChartData | null {
  if (!weights.length) return null;

  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const yTicks = getYTicks(rawMin, rawMax);
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const yRange = yMax - yMin || 1;

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const points = weights.map((weight, index) => {
    const x =
      weights.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (weights.length - 1)) * plotWidth;
    const y =
      PADDING.top + plotHeight - ((weight - yMin) / yRange) * plotHeight;
    return { x, y, weight, day: index + 1 };
  });

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${
          PADDING.top + plotHeight
        } L ${points[0].x} ${PADDING.top + plotHeight} Z`
      : "";

  const xLabels = weights.map((_, index) => ({
    label: `Day ${index + 1}`,
    x:
      weights.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (weights.length - 1)) * plotWidth,
  }));

  return { yTicks, yMin, yMax, plotHeight, points, linePath, areaPath, xLabels };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function weightsKey(weights: number[]) {
  return weights.join(",");
}

function interpolateWeights(from: number[], to: number[], t: number): number[] {
  return to.map((target, index) => {
    const start =
      from[index] ??
      from[from.length - 1] ??
      target;
    return lerp(start, target, t);
  });
}

export function WeightProgressChart({ history }: { history: WeightEntry[] }) {
  const targetWeights = useMemo(
    () => history.map((entry) => Number(entry.weight)),
    [history]
  );
  const targetChart = useMemo(
    () => computeChart(targetWeights),
    [targetWeights]
  );

  const [displayChart, setDisplayChart] = useState<ChartData | null>(targetChart);
  const [highlightDay, setHighlightDay] = useState<number | null>(null);
  const fromWeightsRef = useRef<number[]>(targetWeights);
  const frameRef = useRef<number | null>(null);
  const prevKeyRef = useRef(weightsKey(targetWeights));

  useEffect(() => {
    const nextKey = weightsKey(targetWeights);
    if (nextKey === prevKeyRef.current || !targetChart) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      fromWeightsRef.current = targetWeights;
      prevKeyRef.current = nextKey;
      setDisplayChart(targetChart);
      setHighlightDay(targetWeights.length);
      return;
    }

    const fromWeights = fromWeightsRef.current;
    const start = performance.now();
    const addedPoint = targetWeights.length > fromWeights.length;

    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
    }

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / ANIMATION_MS);
      const eased = easeOutCubic(progress);
      const animatedWeights = interpolateWeights(fromWeights, targetWeights, eased);
      setDisplayChart(computeChart(animatedWeights));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromWeightsRef.current = targetWeights;
        prevKeyRef.current = nextKey;
        setDisplayChart(targetChart);
        if (addedPoint) {
          setHighlightDay(targetWeights.length);
          window.setTimeout(() => setHighlightDay(null), 900);
        }
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [targetWeights, targetChart]);

  const chart = displayChart ?? targetChart;
  if (!chart) return null;

  const yToPixel = (value: number) => {
    const yRange = chart.yMax - chart.yMin || 1;
    return (
      PADDING.top +
      chart.plotHeight -
      ((value - chart.yMin) / yRange) * chart.plotHeight
    );
  };

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="min-w-[320px]">
        <p className="text-sm font-semibold text-white">Weight Progress</p>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="mt-4 w-full"
          role="img"
          aria-label="Weight progress chart"
        >
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity="0.5" />
              <stop offset="100%" stopColor={BRAND_BLUE} stopOpacity="0" />
            </linearGradient>
          </defs>

          {chart.yTicks.map((tick) => {
            const y = yToPixel(tick);
            return (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={y}
                  stroke="#3f3f46"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
                <text
                  x={PADDING.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-zinc-500 text-[11px]"
                >
                  {tick} kg
                </text>
              </g>
            );
          })}

          {chart.areaPath && (
            <path
              d={chart.areaPath}
              fill="url(#weightGradient)"
              opacity={0.35}
              style={{ transition: "d 0.05s linear" }}
            />
          )}

          {chart.linePath && (
            <path
              d={chart.linePath}
              fill="none"
              stroke={BRAND_BLUE}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {chart.points.map((point) => {
            const isLatest = point.day === highlightDay;
            return (
              <g key={point.day}>
                {isLatest && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={12}
                    fill={BRAND_BLUE}
                    opacity={0.25}
                    className="animate-ping"
                  />
                )}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isLatest ? 6 : 5}
                  fill={BRAND_BLUE}
                  stroke="#18181b"
                  strokeWidth={2}
                  style={{ transition: "cx 0.05s linear, cy 0.05s linear, r 0.3s ease" }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={2}
                  fill="white"
                  style={{ transition: "cx 0.05s linear, cy 0.05s linear" }}
                />
              </g>
            );
          })}

          {chart.xLabels.map((label) => (
            <text
              key={label.label}
              x={label.x}
              y={CHART_HEIGHT - 16}
              textAnchor="middle"
              className="fill-zinc-500 text-[11px]"
              style={{ transition: "x 0.05s linear" }}
            >
              {label.label}
            </text>
          ))}
        </svg>

        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-[#6B93B8]">
            <span className="h-1 w-1 rounded-full bg-white" />
          </span>
          Weight (kg)
        </div>
      </div>
    </div>
  );
}
