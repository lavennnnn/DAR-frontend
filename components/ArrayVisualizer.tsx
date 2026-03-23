import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AntennaUnit, AntennaStatus } from '../types';

interface ArrayVisualizerProps {
  data: AntennaUnit[];
  labels: { unitId: string; status: string; signal: string };
  onUnitClick?: (unit: AntennaUnit) => void;
}

const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({ data, labels, onUnitClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const hasPos = data.some(d => d.xPos !== undefined && d.yPos !== undefined);
    const xValues = hasPos ? Array.from(new Set(data.map(d => d.xPos))).sort((a, b) => (a ?? 0) - (b ?? 0)) : [];
    const yValues = hasPos ? Array.from(new Set(data.map(d => d.yPos))).sort((a, b) => (a ?? 0) - (b ?? 0)) : [];

    // Determine grid size based on data or default to 16x16
    let cols = Math.ceil(Math.sqrt(data.length || 256));
    let rows = Math.ceil((data.length || 256) / cols);
    let useIndexGrid = true;

    if (hasPos && xValues.length > 0 && yValues.length > 0) {
      if (xValues.length * yValues.length >= data.length) {
        cols = xValues.length;
        rows = yValues.length;
        useIndexGrid = false;
      }
    }

    const cellSize = 10;
    const cellGap = 1;
    const rectSize = cellSize - cellGap;
    const padding = 1;
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;
    const viewWidth = gridWidth + padding * 2;
    const viewHeight = gridHeight + padding * 2;

    svg
      .attr("viewBox", `0 0 ${viewWidth} ${viewHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("transform", `translate(${padding},${padding})`);

    // Color scale based on amplitude (formerly signalStrength)
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateInferno);

    // Tooltip div
    const tooltip = d3.select(wrapperRef.current)
      .selectAll<HTMLDivElement, null>(".array-tooltip")
      .data([null])
      .join("div")
      .attr("class", "array-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(15, 23, 42, 0.9)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("border", "1px solid #475569")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("z-index", "10");

    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      // Map xPos/yPos. If data is missing pos, fallback to index based calc
      .attr("x", (d, i) => {
        if (!useIndexGrid && d.xPos !== undefined) {
          const xIndex = xValues.indexOf(d.xPos);
          return Math.max(0, xIndex) * cellSize + cellGap / 2;
        }
        return (i % cols) * cellSize + cellGap / 2;
      })
      .attr("y", (d, i) => {
        if (!useIndexGrid && d.yPos !== undefined) {
          const yIndex = yValues.indexOf(d.yPos);
          return Math.max(0, yIndex) * cellSize + cellGap / 2;
        }
        return Math.floor(i / cols) * cellSize + cellGap / 2;
      })
      .attr("width", rectSize)
      .attr("height", rectSize)
      .attr("rx", 1.6)
      .attr("fill", d => {
        if (d.status === AntennaStatus.Fault) return '#ef4444'; // Red
        if (d.status === AntennaStatus.Idle) return '#334155'; // Slate 700
        return colorScale(d.amplitude || 0);
      })
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 0.6)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          event.stopPropagation(); // 防止冒泡
          if (onUnitClick) {
            onUnitClick(d); // 将当前点击的数据传出去
          }
        })
      .on("mouseover", (event, d) => {
        const statusText = 
          d.status === AntennaStatus.Active ? 'Active' : 
          d.status === AntennaStatus.Fault ? 'Fault' : 'Idle';
          
        tooltip
          .style("visibility", "visible")
          .html(`
            <strong>${labels.unitId}: ${d.id}</strong><br/>
            ${labels.status}: ${statusText}<br/>
            ${labels.signal}: ${d.amplitude}%<br/>
            Phase: ${d.phase?.toFixed(2) || 0}<br/>
            Code: ${d.code || 'N/A'}
          `);
        d3.select(event.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", 2);
      })
      .on("mousemove", (event) => {
        const [x, y] = d3.pointer(event, wrapperRef.current);
        tooltip
          .style("top", (y - 40) + "px")
          .style("left", (x + 10) + "px");
      })
      .on("mouseout", (event) => {
        tooltip.style("visibility", "hidden");
        d3.select(event.currentTarget).attr("stroke", "#1e293b").attr("stroke-width", 1);
      });

  }, [data, labels]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative min-h-[400px] overflow-hidden">
      <svg ref={svgRef} className="block w-full h-full" preserveAspectRatio="xMidYMid meet"></svg>
    </div>
  );
};

export default ArrayVisualizer;
