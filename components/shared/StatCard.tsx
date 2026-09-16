import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'yellow';
}

export function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm glass-panel-hover relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-extrabold text-zinc-900 mt-1 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-zinc-600 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl bg-yellow-400 text-black shadow-md shadow-yellow-400/20">
          <Icon className="w-6 h-6 text-black" />
        </div>
      </div>
    </div>
  );
}
