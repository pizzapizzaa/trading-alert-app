import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  Line,
  Circle,
} from 'react-native-svg';
import type { PricePoint } from '@/hooks/usePriceHistory';
import type { ChartRange } from '@/services/priceService';

interface PriceChartProps {
  data: PricePoint[];
  color: string;
  /** Width of the visible container (screen width minus padding) */
  visibleWidth: number;
  height?: number;
  range?: ChartRange;
}

// Space reserved around the chart line area
const PAD = { top: 20, bottom: 36, left: 4, right: 56 };

/** Minimum px per data point — drives horizontal scroll expansion */
const MIN_PX_PER_POINT = 8;

function fmtPrice(price: number): string {
  if (price >= 100) {
    return '$' + Math.round(price).toLocaleString('en-US');
  }
  return '$' + price.toFixed(2);
}

function fmtLabel(ms: number, range: ChartRange): string {
  const d = new Date(ms);
  switch (range) {
    case '1H':
    case '1D':
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case '1W':
      return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    case '1M':
    case '3M':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '6M':
    case '1Y':
      return d.toLocaleDateString('en-US', { month: 'short' });
    case '3Y':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export function PriceChart({ data, color, visibleWidth, height = 155, range = '1W' }: PriceChartProps) {
  const contentWidth = Math.max(visibleWidth, data.length * MIN_PX_PER_POINT);

  const computed = useMemo(() => {
    const cw = contentWidth - PAD.left - PAD.right;
    const ch = height - PAD.top - PAD.bottom;
    const midFlatY = PAD.top + ch / 2;

    if (data.length < 2) {
      return {
        linePath: `M ${PAD.left} ${midFlatY} L ${PAD.left + cw} ${midFlatY}`,
        fillPath: null,
        minP: 0,
        maxP: 0,
        midP: 0,
        dateLabels: [] as Array<{ x: number; label: string }>,
        lastCoord: null as null | { x: number; y: number },
        yForPrice: (_: number) => midFlatY,
      };
    }

    const prices = data.map((d) => d.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range2 = maxP - minP || 1;
    const midP = (minP + maxP) / 2;

    const yForPrice = (price: number) =>
      PAD.top + (1 - (price - minP) / range2) * ch;

    const coords = data.map((d, i) => ({
      x: PAD.left + (i / (data.length - 1)) * cw,
      y: yForPrice(d.price),
      time: d.time,
    }));

    // Smooth cubic Bezier
    let line = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
    for (let i = 1; i < coords.length; i++) {
      const p = coords[i - 1];
      const c = coords[i];
      const cpx = ((p.x + c.x) / 2).toFixed(2);
      line += ` C ${cpx} ${p.y.toFixed(2)} ${cpx} ${c.y.toFixed(2)} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
    }

    const last = coords[coords.length - 1];
    const fill = `${line} L ${last.x.toFixed(2)} ${PAD.top + ch} L ${PAD.left} ${PAD.top + ch} Z`;

    // Deduplicate labels by formatted string, then cap at 6 evenly spaced
    const seen = new Set<string>();
    const perLabel: Array<{ x: number; label: string }> = [];
    for (const coord of coords) {
      const label = fmtLabel(coord.time, range);
      if (!seen.has(label)) {
        seen.add(label);
        perLabel.push({ x: coord.x, label });
      }
    }
    const MAX_LABELS = 6;
    let dateLabels: Array<{ x: number; label: string }>;
    if (perLabel.length <= MAX_LABELS) {
      dateLabels = perLabel;
    } else {
      const step = (perLabel.length - 1) / (MAX_LABELS - 1);
      dateLabels = Array.from({ length: MAX_LABELS }, (_, i) =>
        perLabel[Math.round(i * step)]
      );
    }

    return {
      linePath: line,
      fillPath: fill,
      minP,
      maxP,
      midP,
      dateLabels,
      lastCoord: last,
      yForPrice,
    };
  }, [data, contentWidth, height, range]);

  const { linePath, fillPath, minP, maxP, midP, dateLabels, lastCoord, yForPrice } = computed;
  const chartRight = PAD.left + (contentWidth - PAD.left - PAD.right);
  const labelX = chartRight + 5;
  const priceLabels =
    data.length >= 2
      ? [
          { price: maxP, opacity: 1 },
          { price: midP, opacity: 0.6 },
          { price: minP, opacity: 1 },
        ]
      : [];

  return (
    <View style={{ width: visibleWidth, height }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={contentWidth > visibleWidth}
        contentContainerStyle={{ width: contentWidth }}
      >
        <Svg width={contentWidth} height={height}>
          <Defs>
            <LinearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.35" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Dashed grid lines + right-side price labels */}
          {priceLabels.map(({ price, opacity }) => {
            const y = yForPrice(price);
            return (
              <React.Fragment key={price}>
                <Line
                  x1={PAD.left}
                  y1={y}
                  x2={chartRight}
                  y2={y}
                  stroke={`rgba(255,255,255,${opacity * 0.12})`}
                  strokeWidth="1"
                  strokeDasharray="3,4"
                />
                <SvgText
                  x={labelX}
                  y={y + 4}
                  fontSize={9}
                  fill={`rgba(170,170,170,${opacity})`}
                  textAnchor="start"
                >
                  {fmtPrice(price)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Gradient fill */}
          {fillPath ? <Path d={fillPath} fill="url(#cg)" /> : null}

          {/* Price line */}
          <Path
            d={linePath}
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-axis date labels */}
          {dateLabels.map((item) => (
            <SvgText
              key={item.label}
              x={item.x}
              y={height - 8}
              fontSize={9}
              fill="rgba(102,102,102,1)"
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          ))}

          {/* Live price dot with glow */}
          {lastCoord && (
            <>
              <Circle cx={lastCoord.x} cy={lastCoord.y} r={8} fill={color} opacity={0.15} />
              <Circle cx={lastCoord.x} cy={lastCoord.y} r={4} fill={color} opacity={0.4} />
              <Circle cx={lastCoord.x} cy={lastCoord.y} r={2.5} fill={color} />
            </>
          )}
        </Svg>
      </ScrollView>
    </View>
  );
}

