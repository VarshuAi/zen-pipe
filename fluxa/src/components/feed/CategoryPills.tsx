import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gamepad2,
  Cpu,
  Code2,
  Headphones,
  Atom,
  Trophy,
  Zap,
  Palette,
} from 'lucide-react';
import { useFluxa } from '../../context/FluxaContext';
import { CATEGORIES } from '../../data/mockData';
import { Category } from '../../types';

const CATEGORY_ICONS: Record<Category, React.ElementType> = {
  All: Sparkles,
  Gaming: Gamepad2,
  'Cyberpunk & Tech': Cpu,
  'Coding & Dev': Code2,
  'Synthwave & Lo-Fi': Headphones,
  'AI & Science': Atom,
  Esports: Trophy,
  Speedruns: Zap,
  'IRL & Creative': Palette,
};

export const CategoryPills: React.FC = () => {
  const { activeCategory, setActiveCategory } = useFluxa();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="relative flex items-center w-full py-3 select-none">
      {/* Left scroll chevron */}
      {canScrollLeft && (
        <div className="absolute left-0 z-10 flex items-center h-full pr-4 bg-gradient-to-r from-[#07090e] via-[#07090e]/90 to-transparent">
          <button
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-full bg-slate-900 border border-cyan-500/40 text-slate-300 hover:text-cyan-400 hover:border-cyan-400 transition-all shadow-[0_0_12px_rgba(0,0,0,0.8)]"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pill buttons horizontal list */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1 w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          const Icon = CATEGORY_ICONS[category] || Sparkles;

          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_18px_rgba(0,240,255,0.45)] border border-cyan-300 scale-[1.02]'
                  : 'bg-slate-900/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'
                }`}
              />
              <span>{category}</span>
            </button>
          );
        })}
      </div>

      {/* Right scroll chevron */}
      {canScrollRight && (
        <div className="absolute right-0 z-10 flex items-center h-full pl-4 bg-gradient-to-l from-[#07090e] via-[#07090e]/90 to-transparent">
          <button
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-full bg-slate-900 border border-cyan-500/40 text-slate-300 hover:text-cyan-400 hover:border-cyan-400 transition-all shadow-[0_0_12px_rgba(0,0,0,0.8)]"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
