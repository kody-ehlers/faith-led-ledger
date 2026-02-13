import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { formatCurrency } from "@/utils/calculations";

const COLORS = [
  "hsl(142, 70%, 45%)",
  "hsl(215, 60%, 50%)",
  "hsl(263, 60%, 55%)",
  "hsl(43, 95%, 55%)",
  "hsl(0, 75%, 55%)",
  "hsl(186, 70%, 45%)",
  "hsl(330, 70%, 55%)",
  "hsl(30, 80%, 55%)",
];

interface ChartDataItem {
  name: string;
  value: number;
}

interface CleanPieChartProps {
  data: ChartDataItem[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <p className="text-sm text-muted-foreground">{formatCurrency(value)}</p>
    </div>
  );
};

const renderLabel = ({ percent }: any) => {
  if (percent < 0.03) return null;
  return `${(percent * 100).toFixed(0)}%`;
};

export default function CleanPieChart({ data, height = 300 }: CleanPieChartProps) {
  if (!data.length || data.every((d) => d.value === 0)) {
    return <p className="text-sm text-muted-foreground py-4">No data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="40%"
          cy="50%"
          outerRadius={90}
          innerRadius={45}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-xs text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
