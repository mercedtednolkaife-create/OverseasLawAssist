import React from 'react';
import { Share2 } from 'lucide-react';

interface InteractiveCitationGraphProps {
  activeNormId?: string;
  onSelectNorm: (normId: string) => void;
  isUS?: boolean;
}

export const InteractiveCitationGraph: React.FC<InteractiveCitationGraphProps> = ({
  activeNormId = 'BGB-437',
  onSelectNorm,
  isUS = false,
}) => {
  const deNodes = [
    { id: 'BGB-437', code: '§ 437 BGB', label: '瑕疵救济总枢', x: 260, y: 95 },
    { id: 'BGB-323', code: '§ 323 BGB', label: '宽限期解除权', x: 88, y: 42 },
    { id: 'BGB-280', code: '§ 280 BGB', label: '过错推定赔偿', x: 432, y: 42 },
    { id: 'BGB-281', code: '§ 281 BGB', label: '替代差价索赔', x: 432, y: 150 },
    { id: 'BGB-434', code: '§ 434 BGB', label: '2022 瑕疵定义', x: 88, y: 150, external: true },
  ];

  const deLinks = [
    { from: 'BGB-437', to: 'BGB-323', tag: 'Nr. 2 准用' },
    { from: 'BGB-437', to: 'BGB-280', tag: 'Nr. 3 准用' },
    { from: 'BGB-437', to: 'BGB-281', tag: '差价索赔' },
    { from: 'BGB-437', to: 'BGB-434', tag: '前置定义' },
    { from: 'BGB-280', to: 'BGB-281', tag: 'Abs. 3 叠加' },
  ];

  const usNodes = [
    { id: 'UCC-2-601', code: 'UCC § 2-601', label: '完美履行/救济总则', x: 260, y: 95 },
    { id: 'UCC-2-607', code: 'UCC § 2-607', label: '合理通知抗辩', x: 88, y: 42 },
    { id: 'UCC-2-608', code: 'UCC § 2-608', label: '实质贬损撤销受领', x: 432, y: 42 },
    { id: 'UCC-2-714', code: 'UCC § 2-714', label: '违约与附随损失', x: 432, y: 150 },
    { id: 'USC-1782', code: '28 U.S.C. § 1782', label: '跨国调证程序', x: 88, y: 150, external: true },
  ];

  const usLinks = [
    { from: 'UCC-2-601', to: 'UCC-2-607', tag: '前置门槛' },
    { from: 'UCC-2-601', to: 'UCC-2-608', tag: '受领撤销' },
    { from: 'UCC-2-601', to: 'UCC-2-714', tag: '索赔救济' },
    { from: 'UCC-2-607', to: 'USC-1782', tag: '恶意突破' },
    { from: 'UCC-2-608', to: 'UCC-2-714', tag: '并存赔偿' },
  ];

  const nodes = isUS ? usNodes : deNodes;
  const links = isUS ? usLinks : deLinks;

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Share2 className="w-3.5 h-3.5 text-slate-500" />
          <span>法典与判例关联图谱（点击节点穿透查看条文与判例）</span>
        </span>
      </div>

      <svg className="w-full h-[185px] select-none" viewBox="0 0 520 190">
        {links.map((lk, idx) => {
          const s = getNode(lk.from);
          const t = getNode(lk.to);
          if (!s || !t) return null;
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          return (
            <g key={idx}>
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#94A3B8"
                strokeOpacity="0.5"
                strokeWidth="1.25"
                strokeDasharray="4 3"
              />
              <rect
                x={midX - 28}
                y={midY - 8}
                width="56"
                height="16"
                rx="6"
                fill="#FFFFFF"
                stroke="#E2E8F0"
              />
              <text
                x={midX}
                y={midY + 3}
                textAnchor="middle"
                className="text-[9px] fill-slate-500 font-medium"
              >
                {lk.tag}
              </text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const isSelected = activeNormId === node.id || activeNormId?.includes(node.code.replace('§', '').trim());
          const canClick = true;
          return (
            <g
              key={node.id}
              onClick={() => canClick && onSelectNorm(node.id)}
              className={canClick ? 'cursor-pointer' : 'cursor-default opacity-70'}
            >
              <rect
                x={node.x - 58}
                y={node.y - 21}
                width="116"
                height="42"
                rx="10"
                fill={isSelected ? '#0F172A' : '#FFFFFF'}
                stroke={isSelected ? '#1E40AF' : '#CBD5E1'}
                strokeWidth={isSelected ? '1.75' : '1.2'}
              />
              <text
                x={node.x}
                y={node.y - 3}
                textAnchor="middle"
                className={`text-[11px] font-bold font-mono ${
                  isSelected ? 'fill-white' : 'fill-slate-900'
                }`}
              >
                {node.code}
              </text>
              <text
                x={node.x}
                y={node.y + 11}
                textAnchor="middle"
                className={`text-[10px] ${isSelected ? 'fill-slate-300' : 'fill-slate-500'}`}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
