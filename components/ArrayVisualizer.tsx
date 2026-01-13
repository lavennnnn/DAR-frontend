import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AntennaUnit, AntennaStatus } from '../types';

interface ArrayVisualizerProps {
  data: AntennaUnit[];
  labels: { unitId: string; status: string; signal: string };
}

const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({ data, labels }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight || 400,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    // Determine grid size based on data or default to 16x16
    const cols = Math.ceil(Math.sqrt(data.length || 256)); 
    const cellSize = Math.min(innerWidth / cols, innerHeight / cols) * 0.9;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left + (innerWidth - cols * cellSize) / 2},${margin.top + (innerHeight - cols * cellSize) / 2})`);

    // Color scale based on amplitude (formerly signalStrength)
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateInferno);

    // Tooltip div
    const tooltip = d3.select(wrapperRef.current)
      .append("div")
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
      .attr("x", (d, i) => (d.xPos ?? (i % cols)) * cellSize)
      .attr("y", (d, i) => (d.yPos ?? Math.floor(i / cols)) * cellSize)
      .attr("width", cellSize - 2)
      .attr("height", cellSize - 2)
      .attr("rx", 4)
      .attr("fill", d => {
        if (d.status === AntennaStatus.Fault) return '#ef4444'; // Red
        if (d.status === AntennaStatus.Idle) return '#334155'; // Slate 700
        return colorScale(d.amplitude || 0);
      })
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1)
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

  }, [data, dimensions, labels]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative min-h-[400px]">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block"></svg>
    </div>
  );
};

export default ArrayVisualizer;