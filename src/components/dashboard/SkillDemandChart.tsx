import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SkillDemandItem {
  skill: string;
  count: number;
  demandLevel?: string;
}

interface SkillDemandChartProps {
  data: SkillDemandItem[];
  studentSkills: string[];
}

export const SkillDemandChart: React.FC<SkillDemandChartProps> = ({
  data,
  studentSkills,
}) => {
  // Sort and take top 8
  const chartData = (data || []).slice(0, 8);

  const inDemandList = chartData.map((d) => d.skill);
  const covered = studentSkills.filter((s) => inDemandList.includes(s));
  const missing = inDemandList.filter((s) => !studentSkills.includes(s));
  const coveragePercent =
    inDemandList.length > 0 ? Math.round((covered.length / inDemandList.length) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Most In-Demand Skills on Campus
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Frequency of skills requested across active project and hackathon teams
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
            {coveragePercent}% Your Skill Match
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No campus skill data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="skill"
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                width={85}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const isCovered = studentSkills.includes(item.skill);
                    return (
                      <div className="bg-slate-900 text-white text-xs rounded-lg p-2.5 shadow-lg border border-slate-800 space-y-1">
                        <p className="font-bold">{item.skill}</p>
                        <p className="text-slate-300">
                          {item.count} active listing requests
                        </p>
                        <p
                          className={
                            isCovered ? 'text-emerald-400 font-semibold' : 'text-amber-300'
                          }
                        >
                          {isCovered ? '✓ In your profile' : '• Not in your profile'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                {chartData.map((entry, index) => {
                  const isCovered = studentSkills.includes(entry.skill);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isCovered ? '#7c3aed' : '#cbd5e1'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Your Skill Coverage Breakdown */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Your Skill Coverage
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            {covered.length} of {inDemandList.length} top skills covered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Covered */}
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1.5">
            <div className="flex items-center text-xs font-bold text-purple-800">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
              <span>Skills You Have in High Demand</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {covered.length > 0 ? (
                covered.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white text-purple-700 border border-purple-200"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Add more skills to your profile to match demand
                </span>
              )}
            </div>
          </div>

          {/* Missing / High Opportunity */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center text-xs font-bold text-slate-700">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Trending Campus Skills to Learn</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-600 border border-slate-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
