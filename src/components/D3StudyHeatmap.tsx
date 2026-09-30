import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Flame, Calendar, BarChart2, Grid, Award, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { SubjectItem } from '../types';

interface D3StudyHeatmapProps {
  subjects: SubjectItem[];
  selectedSubjectId: string;
}

interface DayActivity {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  revisionCount: number;
  topics: string[];
}

export const D3StudyHeatmap: React.FC<D3StudyHeatmapProps> = ({
  subjects,
  selectedSubjectId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<'heatmap' | 'weekly_bars'>('heatmap');
  const [weeksCount, setWeeksCount] = useState<number>(12); // Last 12 weeks (approx 3 months)

  // 1. Gather all study activity per date
  const activityMap = useMemo(() => {
    const map = new Map<string, { count: number; topics: Set<string> }>();

    subjects.forEach((sub) => {
      if (selectedSubjectId !== 'all' && sub.id !== selectedSubjectId) return;

      sub.topics.forEach((top) => {
        // Collect from explicit history logs
        if (top.settings.history && top.settings.history.length > 0) {
          top.settings.history.forEach((h) => {
            const cur = map.get(h.date) || { count: 0, topics: new Set() };
            if (h.completed) cur.count++;
            cur.topics.add(top.name);
            map.set(h.date, cur);
          });
        }

        // Also if lastRevisedAt exists
        if (top.settings.lastRevisedAt) {
          const dStr = top.settings.lastRevisedAt;
          const cur = map.get(dStr) || { count: 0, topics: new Set() };
          // If no history was logged for this date, count it as one revision
          if (!top.settings.history?.some((h) => h.date === dStr)) {
            cur.count++;
          }
          cur.topics.add(top.name);
          map.set(dStr, cur);
        }
      });
    });

    return map;
  }, [subjects, selectedSubjectId]);

  // 2. Generate days grid for the last N weeks ending today
  const { daysData, weeksData, streakStats } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = weeksCount * 7;
    // Align to the end of the current week (Sunday or Saturday)
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const days: DayActivity[] = [];

    // Start date totalDays ago, aligned
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + (6 - dayOfWeek));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let activeDaysCount = 0;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const entry = activityMap.get(dateStr);
      const count = entry?.count || 0;
      const topics = entry ? Array.from(entry.topics) : [];

      days.push({
        date: d,
        dateStr,
        revisionCount: count,
        topics,
      });

      if (count > 0) {
        activeDaysCount++;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak working backwards from today
    for (let i = days.length - 1; i >= 0; i--) {
      const d = days[i];
      if (d.date > today) continue; // Future days in current week
      if (d.revisionCount > 0) {
        currentStreak++;
      } else if (d.dateStr === today.toISOString().split('T')[0]) {
        // If today has 0 revisions, check if yesterday had study
        continue;
      } else {
        break;
      }
    }

    // Group by weeks for weekly bar chart
    const weeks: { weekLabel: string; totalRevisions: number; daysActive: number }[] = [];
    for (let w = 0; w < weeksCount; w++) {
      const weekDays = days.slice(w * 7, (w + 1) * 7);
      const weekRevs = weekDays.reduce((acc, cur) => acc + cur.revisionCount, 0);
      const activeInWeek = weekDays.filter((d) => d.revisionCount > 0).length;
      const firstDay = weekDays[0].date;
      const weekLabel = firstDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      weeks.push({
        weekLabel,
        totalRevisions: weekRevs,
        daysActive: activeInWeek,
      });
    }

    const consistencyPercent = Math.round((activeDaysCount / totalDays) * 100);

    return {
      daysData: days,
      weeksData: weeks,
      streakStats: {
        currentStreak,
        longestStreak,
        activeDaysCount,
        totalDays,
        consistencyPercent,
      },
    };
  }, [activityMap, weeksCount]);

  // 3. Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const tooltip = d3.select(tooltipRef.current);
    const containerWidth = containerRef.current.clientWidth || 700;

    const isDark = document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (chartType === 'heatmap') {
      // D3 HEATMAP RENDERING
      const cellSize = Math.max(12, Math.min(18, Math.floor((containerWidth - 60) / weeksCount) - 3));
      const cellGap = 3;
      const marginLeft = 36;
      const marginTop = 26;
      const height = marginTop + 7 * (cellSize + cellGap) + 20;
      const width = marginLeft + weeksCount * (cellSize + cellGap) + 10;

      svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

      // Color scale based on revision count
      const colorScale = d3
        .scaleThreshold<number, string>()
        .domain([1, 2, 4, 6])
        .range(['#f4f4f5', '#d1fae5', '#6ee7b7', '#10b981', '#059669']);

      // Weekday labels (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayLabelsG = svg.append('g').attr('class', 'day-labels');

      [1, 3, 5].forEach((dIdx) => {
        dayLabelsG
          .append('text')
          .attr('x', marginLeft - 6)
          .attr('y', marginTop + dIdx * (cellSize + cellGap) + cellSize * 0.75)
          .attr('text-anchor', 'end')
          .attr('font-size', '10px')
          .attr('fill', '#71717a')
          .text(dayNames[dIdx]);
      });

      // Month headers
      const monthG = svg.append('g').attr('class', 'month-labels');
      let lastMonth = -1;

      for (let w = 0; w < weeksCount; w++) {
        const firstDayOfWeek = daysData[w * 7]?.date;
        if (!firstDayOfWeek) continue;

        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth) {
          lastMonth = month;
          monthG
            .append('text')
            .attr('x', marginLeft + w * (cellSize + cellGap))
            .attr('y', marginTop - 8)
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('fill', '#52525b')
            .text(firstDayOfWeek.toLocaleDateString(undefined, { month: 'short' }));
        }
      }

      // Heatmap Cells
      const cellsG = svg.append('g').attr('class', 'heatmap-cells');

      daysData.forEach((day, index) => {
        const weekIndex = Math.floor(index / 7);
        const dayOfWeekIndex = day.date.getDay();

        const x = marginLeft + weekIndex * (cellSize + cellGap);
        const y = marginTop + dayOfWeekIndex * (cellSize + cellGap);

        const rect = cellsG
          .append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('fill', colorScale(day.revisionCount))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer');

        // Interactive hover
        rect
          .on('mouseenter', function (event) {
            d3.select(this)
              .transition()
              .duration(100)
              .attr('stroke', '#6366f1')
              .attr('stroke-width', 2);

            const prettyDate = day.date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            tooltip.style('opacity', '1').html(`
              <div class="font-bold text-zinc-900">${prettyDate}</div>
              <div class="text-emerald-600 font-semibold mt-0.5">${day.revisionCount} revision(s) completed</div>
              ${day.topics.length > 0 ? `<div class="text-zinc-500 text-[10px] mt-1 truncate max-w-[180px]">Topics: ${day.topics.join(', ')}</div>` : ''}
            `);
          })
          .on('mousemove', function (event) {
            const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
            tooltip.style('left', `${mouseX + 15}px`).style('top', `${mouseY - 20}px`);
          })
          .on('mouseleave', function () {
            d3.select(this)
              .transition()
              .duration(150)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 1);

            tooltip.style('opacity', '0');
          });
      });
    } else {
      // D3 WEEKLY BAR CHART RENDERING
      const margin = { top: 20, right: 20, bottom: 40, left: 45 };
      const width = containerWidth;
      const height = 220;

      svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

      // Scales
      const x = d3
        .scaleBand()
        .domain(weeksData.map((d) => d.weekLabel))
        .range([margin.left, width - margin.right])
        .padding(0.28);

      const maxRevisions = Math.max(5, d3.max(weeksData, (d) => d.totalRevisions) || 5);
      const y = d3
        .scaleLinear()
        .domain([0, maxRevisions])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // Grid lines
      svg
        .append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(${margin.left},0)`)
        .call(
          d3
            .axisLeft(y)
            .ticks(4)
            .tickSize(-(width - margin.left - margin.right))
            .tickFormat(() => '')
        )
        .call((g) => g.select('.domain').remove())
        .call((g) =>
          g
            .selectAll('.tick line')
            .attr('stroke', isDark ? '#27272a' : '#e4e4e7')
            .attr('stroke-dasharray', '2,2')
        );

      // X Axis
      svg
        .append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSize(4))
        .call((g) => g.select('.domain').attr('stroke', '#d4d4d8'))
        .call((g) =>
          g
            .selectAll('.tick text')
            .attr('font-size', '10px')
            .attr('fill', '#71717a')
            .attr('angle', -20)
        );

      // Y Axis
      svg
        .append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(
          d3
            .axisLeft(y)
            .ticks(4)
        )
        .call((g) => g.select('.domain').remove())
        .call((g) =>
          g
            .selectAll('.tick text')
            .attr('font-size', '10px')
            .attr('fill', '#71717a')
        );

      // Gradient for bars
      const defs = svg.append('defs');
      const gradient = defs
        .append('linearGradient')
        .attr('id', 'd3-bar-gradient')
        .attr('x1', '0')
        .attr('y1', '0')
        .attr('x2', '0')
        .attr('y2', '1');

      gradient.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1');
      gradient.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6');

      // Bars
      const barsG = svg.append('g').attr('class', 'bars');

      barsG
        .selectAll('rect')
        .data(weeksData)
        .enter()
        .append('rect')
        .attr('x', (d) => x(d.weekLabel) || 0)
        .attr('width', x.bandwidth())
        .attr('y', height - margin.bottom)
        .attr('height', 0)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', 'url(#d3-bar-gradient)')
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('fill', '#4f46e5');

          tooltip.style('opacity', '1').html(`
            <div class="font-bold text-zinc-900">Week of ${d.weekLabel}</div>
            <div class="text-indigo-600 font-semibold mt-0.5">${d.totalRevisions} revisions</div>
            <div class="text-zinc-500 text-[11px]">${d.daysActive} active revision days</div>
          `);
        })
        .on('mousemove', function (event) {
          const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
          tooltip.style('left', `${mouseX + 15}px`).style('top', `${mouseY - 20}px`);
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('fill', 'url(#d3-bar-gradient)');

          tooltip.style('opacity', '0');
        })
        .transition()
        .duration(600)
        .delay((d, i) => i * 30)
        .attr('y', (d) => y(d.totalRevisions))
        .attr('height', (d) => height - margin.bottom - y(d.totalRevisions));
    }
  }, [daysData, weeksData, chartType, weeksCount]);

  return (
    <div className="p-8 sm:p-12 bg-white rounded-[3rem] border border-zinc-200 shadow-sm space-y-10">
      {/* Top Header & Consistency Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 pb-8 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <Flame className="w-6 h-6 fill-amber-50" />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">
                Activity Pulse
              </h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1">
                Visualizing neuroplasticity momentum
              </p>
            </div>
          </div>
        </div>

        {/* View Controls & Time Horizon */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Time range selector */}
          <select
            value={weeksCount}
            onChange={(e) => setWeeksCount(parseInt(e.target.value, 10))}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden"
          >
            <option value={8} className="text-zinc-900">8 Weeks</option>
            <option value={12} className="text-zinc-900">12 Weeks</option>
            <option value={16} className="text-zinc-900">16 Weeks</option>
            <option value={24} className="text-zinc-900">6 Months</option>
          </select>

          {/* Toggle between Heatmap and Bar Chart */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
            <button
              onClick={() => setChartType('heatmap')}
              title="Daily Activity Heatmap"
              className={`px-4 py-2 rounded-xl text-[10px] flex items-center gap-2 transition-all font-black uppercase tracking-widest ${
                chartType === 'heatmap'
                  ? 'bg-zinc-900 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Heatmap</span>
            </button>
            <button
              onClick={() => setChartType('weekly_bars')}
              title="Weekly Volume Bars"
              className={`px-4 py-2 rounded-xl text-[10px] flex items-center gap-2 transition-all font-black uppercase tracking-widest ${
                chartType === 'weekly_bars'
                  ? 'bg-zinc-900 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Weekly</span>
            </button>
          </div>
        </div>
      </div>

      {/* Streak Highlights Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 shadow-inner">
        <div className="flex items-center gap-4 group">
          <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-sm group-hover:scale-110 transition-transform">
            <Flame className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block mb-0.5">Momentum</span>
            <span className="text-base font-black text-zinc-900 font-mono tabular-nums">
              {streakStats.currentStreak}D
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 group">
          <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-sm group-hover:scale-110 transition-transform">
            <Award className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block mb-0.5">Zenith</span>
            <span className="text-base font-black text-zinc-900 font-mono tabular-nums">
              {streakStats.longestStreak}D
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 group">
          <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-sm group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block mb-0.5">Sessions</span>
            <span className="text-base font-black text-zinc-900 font-mono tabular-nums">
              {streakStats.activeDaysCount}D
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 group">
          <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-sm group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block mb-0.5">Stability</span>
            <span className="text-base font-black text-purple-600 font-mono tabular-nums">
              {streakStats.consistencyPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* D3 Graphic Container */}
      <div ref={containerRef} className="relative w-full overflow-x-auto pt-4">
        <svg ref={svgRef} className="mx-auto block" />

        {/* Dynamic D3 Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 bg-white shadow-2xl text-zinc-900 text-[11px] px-4 py-3 rounded-2xl border border-zinc-200 z-30 transition-opacity duration-200"
          style={{ transform: 'translate(0, -100%)' }}
        />
      </div>

      {/* Heatmap Legend */}
      {chartType === 'heatmap' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400">
          <span className="flex items-center gap-3">
            <Info className="w-4 h-4 text-zinc-300" />
            <span>Interactive Node Analysis Enabled</span>
          </span>

          <div className="flex items-center gap-3">
            <span>Sparse</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-full border border-zinc-200">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-200" title="0 revisions" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-100" title="1 revision" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" title="2 revisions" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="4 revisions" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" title="6+ revisions" />
            </div>
            <span>Dense</span>
          </div>
        </div>
      )}
    </div>
  );
};
