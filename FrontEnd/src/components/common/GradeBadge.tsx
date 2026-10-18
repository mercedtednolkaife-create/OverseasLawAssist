import React from 'react';

interface GradeBadgeProps {
  grade?: 'A' | 'B' | 'C' | 'D';
  size?: 'sm' | 'md';
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({ grade = 'A', size = 'sm' }) => {
  const configs = {
    A: {
      label: 'A级 · 官方条文',
      desc: '源自现行有效法典条文，经官方数据库严格校验',
      color: 'text-zinc-900 border-zinc-300 bg-zinc-100',
    },
    B: {
      label: 'B级 · 核验转译',
      desc: '官方来源之语义转述或标准术语译文，逻辑蕴含校验通过',
      color: 'text-zinc-700 border-zinc-200 bg-zinc-50',
    },
    C: {
      label: 'C级 · 待复核',
      desc: '证据相关度偏低或属二手转引材料，建议重点复核',
      color: 'text-zinc-700 border-zinc-200 bg-zinc-100',
    },
    D: {
      label: 'D级 · 仅供线索',
      desc: '模型补充分析，缺乏直接法源锚定，仅供线索参考',
      color: 'text-zinc-500 border-zinc-200 bg-zinc-50',
    },
  };

  const safeGrade = (grade && typeof grade === 'string' && configs[grade.toUpperCase() as keyof typeof configs])
    ? (grade.toUpperCase() as 'A' | 'B' | 'C' | 'D')
    : 'A';

  const cfg = configs[safeGrade];

  return (
    <span
      title={cfg.desc}
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider border rounded-md px-1.5 py-0.5 ${cfg.color} ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      }`}
    >
      <span className="font-bold">{safeGrade}</span>
      <span className="font-sans normal-case tracking-normal text-zinc-500 text-[10px]">
        {safeGrade === 'A' ? '官方现行' : safeGrade === 'B' ? '核验转译' : safeGrade === 'C' ? '待复核' : '仅线索'}
      </span>
    </span>
  );
};
