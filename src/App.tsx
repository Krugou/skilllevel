import { useState, useRef, useLayoutEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import gsap from 'gsap';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  RefreshCw, 
  Tag, 
  Code2, 
  Github, 
  Database, 
  BarChart3, 
  Layers,
  Compass
} from 'lucide-react';
import skillData from './skill_data.json';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SkillCategory {
  name: string;
  count: number;
}

interface SkillData {
  stats: {
    total_packages: number;
    top_package: string;
    timestamp: string;
  };
  packages: Record<string, number>;
  categories: Record<string, SkillCategory[]>;
}

const typedSkillData = skillData as SkillData;

type SectionId = 'about' | 'chart' | 'stats' | 'categories' | 'grid';
type DataSort = 'desc' | 'asc' | 'random';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<number | 'all'>('all');
  const [dataSort, setDataSort] = useState<DataSort>('desc');
  const [randomizedEntries, setRandomizedEntries] = useState<[string, number][]>([]);
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(['about', 'stats', 'chart', 'categories', 'grid']);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const allEntries = useMemo(() => {
    const entries = Object.entries(typedSkillData.packages);
    if (dataSort === 'asc') {
      return [...entries].sort((a, b) => a[1] - b[1]);
    } else if (dataSort === 'random') {
      return randomizedEntries;
    }
    return [...entries].sort((a, b) => b[1] - a[1]);
  }, [dataSort, randomizedEntries]);

  const filteredEntries = useMemo(() => {
    let result = allEntries.filter(([name]) => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedCategory) {
      const categoryPackages = typedSkillData.categories[selectedCategory].map((p) => p.name);
      result = result.filter(([name]) => categoryPackages.includes(name));
    }

    if (typeof filterMode === 'number' && !searchTerm && !selectedCategory) {
      result = result.slice(0, filterMode);
    }

    return result;
  }, [allEntries, searchTerm, selectedCategory, filterMode]);

  const chartPackages = useMemo(() => {
    // Show only first 50 entries in chart to avoid overcrowding, 
    // but respect whatever filters/limits are applied to filteredEntries
    return filteredEntries.slice(0, 50);
  }, [filteredEntries]);

  const labels = chartPackages.map(([name]) => name);
  const counts = chartPackages.map(([, count]) => count);

  const handleRandomize = () => {
    const entries = Object.entries(typedSkillData.packages);
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    setRandomizedEntries(shuffled);
    setDataSort('random');
  };

  const moveSection = (id: SectionId, direction: 'up' | 'down') => {
    const currentIndex = sectionOrder.indexOf(id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sectionOrder.length) return;
    const newOrder = [...sectionOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    setSectionOrder(newOrder);
  };

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.dashboard-section', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      });
    }, containerRef);
    return () => ctx.revert();
  }, [sectionOrder]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Package Frequency',
        data: counts,
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: '#E5C39E',
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A1C1E',
        titleColor: '#E0E4E8',
        bodyColor: '#E0E4E8',
        borderColor: '#D4AF37',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 0,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#ffffff', font: { size: 12, weight: 'bold' as const, family: 'Inter' } }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#ffffff',
          maxRotation: 90,
          minRotation: 90,
          font: { size: 11, family: 'Inter', weight: 'bold' as const }
        }
      }
    },
  };

  const renderSection = (id: SectionId) => {
    const commonHeader = (title: string, sectionId: SectionId, icon: React.ReactNode) => (
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <h2 className="text-2xl font-black text-frost flex items-center gap-3 uppercase tracking-widest">
          {icon}
          {title}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => moveSection(sectionId, 'up')}
            disabled={sectionOrder.indexOf(sectionId) === 0}
            className="p-1.5 hover:text-primary disabled:opacity-10 transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button 
            onClick={() => moveSection(sectionId, 'down')}
            disabled={sectionOrder.indexOf(sectionId) === sectionOrder.length - 1}
            className="p-1.5 hover:text-primary disabled:opacity-10 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );

    switch (id) {
      case 'about':
        return (
          <section key="about" className="dashboard-section architectural-card">
            {commonHeader('Information Hub', 'about', <Compass className="w-5 h-5 text-primary" />)}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              <div className="space-y-4">
                <Database className="text-primary w-8 h-8 opacity-40" />
                <h3 className="text-lg font-bold border-l-2 border-primary pl-3">Data Aggregator</h3>
                <p className="text-tertiary text-sm leading-relaxed font-light">
                  SkillLevel uses a custom Python-based scraper to traverse your local projects and query the GitHub API. It parses <code>package.json</code> files to identify every tool you use.
                </p>
              </div>
              <div className="space-y-4">
                <Layers className="text-primary w-8 h-8 opacity-40" />
                <h3 className="text-lg font-bold border-l-2 border-primary pl-3">Categorization</h3>
                <p className="text-tertiary text-sm leading-relaxed font-light">
                  Advanced pattern matching automatically classifies your stack into domains like Frontend, Backend, and Visualization, helping you visualize your specialization.
                </p>
              </div>
              <div className="space-y-4">
                <BarChart3 className="text-primary w-8 h-8 opacity-40" />
                <h3 className="text-lg font-bold border-l-2 border-primary pl-3">Visualization</h3>
                <p className="text-tertiary text-sm leading-relaxed font-light">
                  Built with React and Chart.js, the dashboard provides a high-level view of your &quot;Engineering DNA&quot; using GSAP for smooth layout transitions.
                </p>
              </div>
              <div className="space-y-4">
                <Code2 className="text-primary w-8 h-8 opacity-40" />
                <h3 className="text-lg font-bold border-l-2 border-primary pl-3">Developer Focus</h3>
                <p className="text-tertiary text-sm leading-relaxed font-light">
                  This tool is designed for software engineers who want to track their technical journey, discover trends in their coding habits, and keep their tech stack fresh.
                </p>
              </div>
            </div>
          </section>
        );
      case 'chart':
        return (
          <section key="chart" className="dashboard-section architectural-card">
            {commonHeader('Top Dependencies Analysis', 'chart', <BarChart3 className="w-5 h-5 text-primary" />)}
            <div className="h-[500px] w-full mt-4">
              <Bar options={options} data={data} />
            </div>
          </section>
        );
      case 'stats':
        return (
          <section key="stats" className="dashboard-section space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface p-8 border-l-4 border-primary shadow-sm hover:translate-x-1 transition-transform">
                <h3 className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Unique Packages</h3>
                <p className="text-5xl font-black text-frost tracking-tighter">{typedSkillData.stats.total_packages}</p>
              </div>
              <div className="bg-surface p-8 border-l-4 border-secondary shadow-sm hover:translate-x-1 transition-transform">
                <h3 className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Primary Tool</h3>
                <p className="text-2xl font-black text-frost truncate mt-2">{typedSkillData.stats.top_package}</p>
              </div>
              <div className="bg-surface p-8 border-l-4 border-tertiary shadow-sm hover:translate-x-1 transition-transform">
                <h3 className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Categories</h3>
                <p className="text-5xl font-black text-frost tracking-tighter">{Object.keys(typedSkillData.categories).length}</p>
              </div>
              <div className="bg-surface p-8 border-l-4 border-wood shadow-sm hover:translate-x-1 transition-transform">
                <h3 className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Last Scraped</h3>
                <p className="text-lg font-black text-frost mt-3 opacity-60 font-mono">{typedSkillData.stats.timestamp.split(' ')[0]}</p>
              </div>
            </div>
          </section>
        );
      case 'categories':
        return (
          <section key="categories" className="dashboard-section architectural-card">
            {commonHeader('Browse Categories', 'categories', <Tag className="w-5 h-5 text-primary" />)}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? 'nordic-button-active' : 'nordic-button'}
              >
                All Packages
              </button>
              {Object.keys(typedSkillData.categories).sort().map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={selectedCategory === cat ? 'nordic-button-active' : 'nordic-button'}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>
        );
      case 'grid':
        return (
          <section key="grid" className="dashboard-section architectural-card">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 border-b border-white/5 pb-4">
              <h2 className="text-2xl font-black text-frost flex items-center gap-3 uppercase tracking-widest">
                <Filter className="w-5 h-5 text-primary" />
                {searchTerm ? 'Search' : (selectedCategory ?? 'Ecosystem')}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-tertiary tracking-tighter">TOTAL_ENTRIES: {filteredEntries.length}</span>
                <div className="flex gap-2">
                  <button onClick={() => moveSection('grid', 'up')} className="p-1 hover:text-primary transition-colors"><ChevronUp size={16} /></button>
                  <button onClick={() => moveSection('grid', 'down')} className="p-1 hover:text-primary transition-colors"><ChevronDown size={16} /></button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-px bg-white/5 border border-white/5">
              {filteredEntries.map(([name, count]) => (
                <div key={name} className="bg-surface p-4 hover:bg-white/5 transition-colors group relative cursor-default">
                  <div className="text-[10px] font-mono text-tertiary mb-1 truncate uppercase tracking-tighter" title={name}>{name}</div>
                  <div className="text-xl font-black text-primary group-hover:text-frost transition-colors">{count}</div>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <div className="col-span-full py-24 text-center text-tertiary italic font-light tracking-widest bg-surface">
                  No match found in current ecosystem
                </div>
              )}
            </div>
          </section>
        );
    }
  };

  const sortSectionsStandard = () => {
    setSectionOrder(['about', 'stats', 'chart', 'categories', 'grid']);
    setDataSort('desc');
    setFilterMode('all');
    setSelectedCategory(null);
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-bg text-frost selection:bg-primary/30 font-sans p-4 sm:p-8 lg:p-12" ref={containerRef}>
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-16 border-l-8 border-primary pl-8 py-4">
          <h1 className="text-6xl font-black tracking-tighter sm:text-8xl mb-2 flex items-baseline gap-4">
            SKILLLEVEL <span className="text-xl font-light text-tertiary tracking-[0.5em] hidden sm:inline">ECOSYSTEM</span>
          </h1>
          <p className="text-tertiary font-light tracking-[0.2em] uppercase text-sm flex items-center gap-4">
            Technical Stack Mapping
            <span className="w-8 h-px bg-white/20" />
            <span className="flex items-center gap-2"><Github className="w-4 h-4" /> 91 Projects Found</span>
          </p>
        </header>

        <div className="space-y-12">
          {/* Functionalist Control Bar */}
          <section className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-surface/50 p-6 border border-white/5 sticky top-8 z-50 backdrop-blur-xl">
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Query ecosystem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-bg border border-white/5 rounded-none pl-12 pr-4 py-3 focus:outline-none focus:border-primary/50 transition-all font-mono text-xs uppercase tracking-widest"
              />
            </div>
            
            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <div className="flex bg-bg p-1 border border-white/5">
                <button onClick={() => setFilterMode('all')} className={`px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-widest ${filterMode === 'all' ? 'bg-primary text-bg' : 'text-tertiary hover:text-frost'}`}>Full</button>
                <button onClick={() => setFilterMode(10)} className={`px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-widest ${filterMode === 10 ? 'bg-primary text-bg' : 'text-tertiary hover:text-frost'}`}>Top 10</button>
                <button onClick={() => setFilterMode(20)} className={`px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-widest ${filterMode === 20 ? 'bg-primary text-bg' : 'text-tertiary hover:text-frost'}`}>Top 20</button>
                <button onClick={() => setFilterMode(50)} className={`px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-widest ${filterMode === 50 ? 'bg-primary text-bg' : 'text-tertiary hover:text-frost'}`}>Top 50</button>
              </div>

              <div className="flex bg-bg p-1 border border-white/5">
                <button onClick={() => setDataSort('desc')} className={`px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-widest ${dataSort === 'desc' ? 'bg-secondary text-frost' : 'text-tertiary hover:text-frost'}`}>Desc</button>
                <button onClick={() => setDataSort('asc')} className={`px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-widest ${dataSort === 'asc' ? 'bg-secondary text-frost' : 'text-tertiary hover:text-frost'}`}>Asc</button>
                <button onClick={handleRandomize} className={`px-4 py-1.5 text-xs font-bold transition-all uppercase tracking-widest flex items-center gap-2 ${dataSort === 'random' ? 'bg-secondary text-frost' : 'text-tertiary hover:text-frost'}`}>
                  <RefreshCw className={`w-3 h-3 ${dataSort === 'random' ? 'animate-spin' : ''}`} /> Rnd
                </button>
              </div>

              <button onClick={sortSectionsStandard} className="px-6 py-2 bg-bg border border-white/5 text-xs font-bold uppercase tracking-widest hover:border-primary transition-all flex items-center gap-2 group">
                <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" /> Reset View
              </button>
            </div>
          </section>

          {sectionOrder.map(renderSection)}
        </div>

        <footer className="mt-24 text-center border-t border-white/5 pt-12 pb-24">
          <p className="font-mono text-[10px] text-tertiary uppercase tracking-[0.5em] opacity-50">
            Automated Analysis System • Helsinki Functionalism Theme • {typedSkillData.stats.timestamp}
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;