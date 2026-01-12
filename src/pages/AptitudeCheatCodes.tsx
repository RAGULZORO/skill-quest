import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Percent, 
  TrendingUp, 
  Clock, 
  Users, 
  Gauge,
  Calculator,
  Layers,
  Divide,
  Triangle,
  CircleDot,
  ArrowRightLeft,
  Scale,
  Wallet,
  Timer,
  Droplets,
  Train,
  Binary,
  Shuffle
} from 'lucide-react';

interface FormulaCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  formulas: Formula[];
}

interface Formula {
  title: string;
  formula: string;
  example?: string;
  tip?: string;
}

const formulaCategories: FormulaCategory[] = [
  {
    id: 'percentage',
    name: 'Percentage',
    icon: Percent,
    color: 'from-blue-500 to-cyan-500',
    formulas: [
      { title: 'Percentage', formula: 'Percentage = (Value / Total) × 100', example: '25 out of 100 = (25/100) × 100 = 25%' },
      { title: 'Value from Percentage', formula: 'Value = (Percentage × Total) / 100', example: '20% of 50 = (20 × 50) / 100 = 10' },
      { title: 'Percentage Increase', formula: 'Increase % = ((New - Old) / Old) × 100', example: 'From 50 to 60: ((60-50)/50) × 100 = 20%' },
      { title: 'Percentage Decrease', formula: 'Decrease % = ((Old - New) / Old) × 100', example: 'From 100 to 80: ((100-80)/100) × 100 = 20%' },
      { title: 'Successive Percentage', formula: 'Net % = a + b + (ab/100)', tip: 'For two successive increases of a% and b%' },
    ]
  },
  {
    id: 'profit-loss',
    name: 'Profit & Loss',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    formulas: [
      { title: 'Profit', formula: 'Profit = Selling Price (SP) - Cost Price (CP)', example: 'SP = ₹150, CP = ₹100, Profit = ₹50' },
      { title: 'Loss', formula: 'Loss = Cost Price (CP) - Selling Price (SP)', example: 'CP = ₹100, SP = ₹80, Loss = ₹20' },
      { title: 'Profit %', formula: 'Profit % = (Profit / CP) × 100', example: 'Profit = ₹20, CP = ₹100, Profit% = 20%' },
      { title: 'Loss %', formula: 'Loss % = (Loss / CP) × 100', example: 'Loss = ₹10, CP = ₹50, Loss% = 20%' },
      { title: 'SP from Profit %', formula: 'SP = CP × (1 + Profit%/100)', tip: 'To find SP when profit% is given' },
      { title: 'SP from Loss %', formula: 'SP = CP × (1 - Loss%/100)', tip: 'To find SP when loss% is given' },
      { title: 'Marked Price', formula: 'Discount = MP - SP', tip: 'Discount % = (Discount/MP) × 100' },
    ]
  },
  {
    id: 'simple-interest',
    name: 'Simple Interest',
    icon: Wallet,
    color: 'from-yellow-500 to-orange-500',
    formulas: [
      { title: 'Simple Interest', formula: 'SI = (P × R × T) / 100', example: 'P=1000, R=10%, T=2yrs → SI = ₹200' },
      { title: 'Amount', formula: 'A = P + SI = P(1 + RT/100)', tip: 'Total amount after interest' },
      { title: 'Principal', formula: 'P = (100 × SI) / (R × T)', tip: 'To find principal from SI' },
      { title: 'Rate', formula: 'R = (100 × SI) / (P × T)', tip: 'To find rate from SI' },
      { title: 'Time', formula: 'T = (100 × SI) / (P × R)', tip: 'To find time from SI' },
    ]
  },
  {
    id: 'compound-interest',
    name: 'Compound Interest',
    icon: Layers,
    color: 'from-purple-500 to-pink-500',
    formulas: [
      { title: 'Compound Amount', formula: 'A = P(1 + R/100)ⁿ', example: 'P=1000, R=10%, n=2 → A = ₹1210' },
      { title: 'Compound Interest', formula: 'CI = A - P = P[(1 + R/100)ⁿ - 1]', tip: 'CI is always more than SI for same P, R, T' },
      { title: 'Half-yearly', formula: 'A = P(1 + R/200)²ⁿ', tip: 'Rate halved, time doubled' },
      { title: 'Quarterly', formula: 'A = P(1 + R/400)⁴ⁿ', tip: 'Rate quartered, time × 4' },
      { title: 'CI vs SI (2 years)', formula: 'CI - SI = P(R/100)²', tip: 'Difference for 2 years only' },
    ]
  },
  {
    id: 'time-work',
    name: 'Time & Work',
    icon: Clock,
    color: 'from-indigo-500 to-blue-500',
    formulas: [
      { title: 'Work Rate', formula: 'If A completes in n days, A\'s 1 day work = 1/n', example: 'A finishes in 10 days → 1/10 per day' },
      { title: 'Combined Work', formula: '1/A + 1/B = 1/T (together)', example: 'A=10 days, B=15 days → Together = 6 days' },
      { title: 'Work Done', formula: 'Work = Rate × Time', tip: 'If rate = 1/10, in 5 days = 5/10 = 1/2 work' },
      { title: 'Men-Days', formula: 'M₁ × D₁ = M₂ × D₂', tip: 'For same work with different workers' },
      { title: 'Efficiency Ratio', formula: 'If A is x times efficient as B, A:B = x:1', tip: 'Time ratio is inverse of efficiency' },
      { title: 'Wages', formula: 'Wages ∝ Work done', tip: 'Divide wages in ratio of work done' },
    ]
  },
  {
    id: 'time-distance',
    name: 'Time & Distance',
    icon: Train,
    color: 'from-red-500 to-rose-500',
    formulas: [
      { title: 'Basic Formula', formula: 'Distance = Speed × Time', example: 'Speed=60 km/h, Time=2h → D=120 km' },
      { title: 'Speed', formula: 'Speed = Distance / Time', tip: 'Units: km/h, m/s, etc.' },
      { title: 'Time', formula: 'Time = Distance / Speed', tip: 'Keep units consistent!' },
      { title: 'km/h to m/s', formula: 'Multiply by 5/18', example: '36 km/h = 36 × 5/18 = 10 m/s' },
      { title: 'm/s to km/h', formula: 'Multiply by 18/5', example: '10 m/s = 10 × 18/5 = 36 km/h' },
      { title: 'Average Speed', formula: 'Avg Speed = Total Distance / Total Time', tip: 'NOT average of speeds!' },
      { title: 'Two Speeds (same distance)', formula: 'Avg = 2S₁S₂ / (S₁ + S₂)', tip: 'Harmonic mean for same distance' },
    ]
  },
  {
    id: 'trains',
    name: 'Trains',
    icon: Train,
    color: 'from-slate-500 to-gray-600',
    formulas: [
      { title: 'Crossing a Pole/Person', formula: 'Time = Length of Train / Speed', tip: 'Object has negligible length' },
      { title: 'Crossing Platform', formula: 'Time = (Train + Platform) / Speed', tip: 'Add both lengths' },
      { title: 'Two Trains (Same Direction)', formula: 'Relative Speed = S₁ - S₂', tip: 'Time = Sum of lengths / Relative speed' },
      { title: 'Two Trains (Opposite)', formula: 'Relative Speed = S₁ + S₂', tip: 'They approach each other' },
      { title: 'Crossing Each Other', formula: 'Time = (L₁ + L₂) / Relative Speed', tip: 'Sum of train lengths' },
    ]
  },
  {
    id: 'pipes-cisterns',
    name: 'Pipes & Cisterns',
    icon: Droplets,
    color: 'from-cyan-500 to-blue-500',
    formulas: [
      { title: 'Inlet Pipe', formula: 'Part filled in 1 hr = 1/n', example: 'Fills in 6 hrs → 1/6 per hour' },
      { title: 'Outlet Pipe', formula: 'Part emptied in 1 hr = 1/n', tip: 'Treated as negative work' },
      { title: 'Combined (Inlet + Outlet)', formula: '1/A - 1/B = 1/T', tip: 'Inlet A hrs, outlet B hrs' },
      { title: 'Multiple Inlets', formula: '1/A + 1/B + 1/C = 1/T', tip: 'Add all inlet rates' },
      { title: 'Net Rate', formula: 'Net = Σ(Inlets) - Σ(Outlets)', tip: 'Positive = filling, Negative = emptying' },
    ]
  },
  {
    id: 'ratio-proportion',
    name: 'Ratio & Proportion',
    icon: Scale,
    color: 'from-amber-500 to-yellow-500',
    formulas: [
      { title: 'Ratio', formula: 'a:b = a/b', example: '3:4 means 3/4' },
      { title: 'Proportion', formula: 'a:b :: c:d means a/b = c/d', tip: 'Product of means = Product of extremes' },
      { title: 'Product Rule', formula: 'a × d = b × c', tip: 'Cross multiplication' },
      { title: 'Dividing in Ratio', formula: 'Parts = Total × (Share/Sum of ratios)', example: '₹100 in 2:3 → ₹40 and ₹60' },
      { title: 'Compounding Ratios', formula: '(a:b) × (c:d) = ac:bd', tip: 'Multiply corresponding terms' },
      { title: 'Duplicate Ratio', formula: 'a²:b²', tip: 'Square of ratio' },
      { title: 'Sub-duplicate Ratio', formula: '√a:√b', tip: 'Square root of ratio' },
    ]
  },
  {
    id: 'averages',
    name: 'Averages',
    icon: Calculator,
    color: 'from-teal-500 to-green-500',
    formulas: [
      { title: 'Average', formula: 'Average = Sum of items / Number of items', example: 'Avg of 10,20,30 = 60/3 = 20' },
      { title: 'Sum from Average', formula: 'Sum = Average × Count', tip: 'Useful for finding totals' },
      { title: 'Weighted Average', formula: '(Σ value × weight) / Σ weights', tip: 'When items have different weights' },
      { title: 'New Average', formula: 'When adding: (Old Sum + New) / (n+1)', tip: 'Recalculate with new count' },
      { title: 'Average Speed', formula: '2S₁S₂/(S₁+S₂) for equal distances', tip: 'Use Total D/Total T for unequal' },
    ]
  },
  {
    id: 'mixtures',
    name: 'Mixtures & Alligation',
    icon: Shuffle,
    color: 'from-violet-500 to-purple-500',
    formulas: [
      { title: 'Alligation Rule', formula: 'Ratio = (d₂ - m) : (m - d₁)', tip: 'd₁ < m < d₂ (prices/concentrations)' },
      { title: 'Mean Price', formula: 'm = (Cost₁×Q₁ + Cost₂×Q₂) / (Q₁+Q₂)', example: 'Weighted average of prices' },
      { title: 'Replacement', formula: 'Final = Initial × (1 - R/V)ⁿ', tip: 'R=replaced qty, V=vessel, n=times' },
      { title: 'Milk & Water', formula: 'After n operations: Milk = M(1-R/V)ⁿ', tip: 'R=qty removed each time' },
      { title: 'Ratio of Mixing', formula: 'Q₁:Q₂ = (P₂-Pₘ):(Pₘ-P₁)', tip: 'Using alligation cross method' },
    ]
  },
  {
    id: 'ages',
    name: 'Ages',
    icon: Users,
    color: 'from-pink-500 to-rose-500',
    formulas: [
      { title: 'Basic Concept', formula: 'Age difference is constant', tip: 'If A-B=5 now, it\'s always 5' },
      { title: 'Ratio Method', formula: 'Present: A:B = x:y, After n yrs: (A+n):(B+n)', example: 'Set up equations and solve' },
      { title: 'Past Age', formula: 'Age n years ago = Present - n', tip: 'Subtract from current age' },
      { title: 'Future Age', formula: 'Age after n years = Present + n', tip: 'Add to current age' },
      { title: 'Sum of Ages', formula: 'Sum increases by n×count after n years', tip: 'Each person ages n years' },
    ]
  },
  {
    id: 'permutation-combination',
    name: 'Permutation & Combination',
    icon: Binary,
    color: 'from-fuchsia-500 to-pink-500',
    formulas: [
      { title: 'Factorial', formula: 'n! = n × (n-1) × ... × 1', example: '5! = 120' },
      { title: 'Permutation', formula: 'ⁿPᵣ = n! / (n-r)!', tip: 'Order matters (arrangements)' },
      { title: 'Combination', formula: 'ⁿCᵣ = n! / [r! × (n-r)!]', tip: 'Order doesn\'t matter (selections)' },
      { title: 'All Arrangements', formula: 'ⁿPₙ = n!', example: 'Arrange 4 people = 4! = 24 ways' },
      { title: 'Circular Permutation', formula: '(n-1)!', tip: 'Seating n people in circle' },
      { title: 'With Repetition', formula: 'n!/(p!×q!×...)', tip: 'p,q items are identical' },
      { title: 'Selection Formula', formula: 'ⁿCᵣ = ⁿCₙ₋ᵣ', tip: 'Selecting r = not selecting n-r' },
    ]
  },
  {
    id: 'probability',
    name: 'Probability',
    icon: CircleDot,
    color: 'from-orange-500 to-amber-500',
    formulas: [
      { title: 'Basic Probability', formula: 'P(E) = Favorable / Total Outcomes', example: 'Coin: P(Head) = 1/2' },
      { title: 'Range', formula: '0 ≤ P(E) ≤ 1', tip: '0 = impossible, 1 = certain' },
      { title: 'Complement', formula: 'P(not E) = 1 - P(E)', tip: 'P(A\') = 1 - P(A)' },
      { title: 'AND (Independent)', formula: 'P(A and B) = P(A) × P(B)', tip: 'Both events occur' },
      { title: 'OR (Mutually Exclusive)', formula: 'P(A or B) = P(A) + P(B)', tip: 'Either event occurs' },
      { title: 'OR (General)', formula: 'P(A∪B) = P(A) + P(B) - P(A∩B)', tip: 'Subtract intersection' },
      { title: 'Odds in Favor', formula: 'Odds = P(E) : P(not E)', tip: 'Favorable : Unfavorable' },
    ]
  },
  {
    id: 'geometry',
    name: 'Geometry & Mensuration',
    icon: Triangle,
    color: 'from-lime-500 to-green-500',
    formulas: [
      { title: 'Area of Triangle', formula: 'A = ½ × base × height', tip: 'Also: √[s(s-a)(s-b)(s-c)] (Heron\'s)' },
      { title: 'Area of Circle', formula: 'A = πr²', example: 'r=7 → A = 154 sq units' },
      { title: 'Circumference', formula: 'C = 2πr = πd', tip: 'd = diameter = 2r' },
      { title: 'Area of Rectangle', formula: 'A = length × breadth', tip: 'Perimeter = 2(l+b)' },
      { title: 'Area of Square', formula: 'A = side²', tip: 'Perimeter = 4 × side' },
      { title: 'Volume of Cube', formula: 'V = a³', tip: 'Surface area = 6a²' },
      { title: 'Volume of Cuboid', formula: 'V = l × b × h', tip: 'Surface area = 2(lb+bh+hl)' },
      { title: 'Volume of Cylinder', formula: 'V = πr²h', tip: 'Curved SA = 2πrh' },
      { title: 'Volume of Cone', formula: 'V = ⅓πr²h', tip: 'Slant height l = √(r²+h²)' },
      { title: 'Volume of Sphere', formula: 'V = ⁴⁄₃πr³', tip: 'Surface area = 4πr²' },
    ]
  },
  {
    id: 'number-system',
    name: 'Number System',
    icon: Divide,
    color: 'from-sky-500 to-blue-500',
    formulas: [
      { title: 'Divisibility by 2', formula: 'Last digit is even (0,2,4,6,8)', tip: 'e.g., 124, 568' },
      { title: 'Divisibility by 3', formula: 'Sum of digits divisible by 3', example: '123 → 1+2+3=6 (divisible)' },
      { title: 'Divisibility by 4', formula: 'Last 2 digits divisible by 4', example: '1324 → 24÷4=6 ✓' },
      { title: 'Divisibility by 5', formula: 'Last digit is 0 or 5', tip: 'e.g., 125, 340' },
      { title: 'Divisibility by 6', formula: 'Divisible by both 2 and 3', tip: 'Check both rules' },
      { title: 'Divisibility by 9', formula: 'Sum of digits divisible by 9', example: '729 → 7+2+9=18 ✓' },
      { title: 'Divisibility by 11', formula: 'Diff of (odd - even placed) ÷ 11', example: '121 → |1+1 - 2| = 0 ✓' },
      { title: 'HCF × LCM', formula: 'HCF × LCM = Product of numbers', tip: 'For two numbers only' },
      { title: 'Sum of n Natural Numbers', formula: 'S = n(n+1)/2', example: 'Sum of 1-10 = 55' },
      { title: 'Sum of Squares', formula: 'S = n(n+1)(2n+1)/6', tip: '1² + 2² + ... + n²' },
      { title: 'Sum of Cubes', formula: 'S = [n(n+1)/2]²', tip: 'Perfect square!' },
    ]
  },
];

const AptitudeCheatCodes = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<FormulaCategory | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => selectedCategory ? setSelectedCategory(null) : navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {selectedCategory ? selectedCategory.name : 'Aptitude Cheat Codes'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedCategory ? 'Quick formulas & tips' : 'Master all formulas before practice'}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!selectedCategory ? (
          <>
            {/* Category Selection */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                📚 Formula Categories
              </h2>
              <p className="text-muted-foreground">
                Select a category to view all formulas and shortcuts
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {formulaCategories.map((category, idx) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className="group bg-card rounded-2xl p-5 text-left shadow-card border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <category.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">
                    {category.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {category.formulas.length} formulas
                  </p>
                </button>
              ))}
            </div>

            {/* Tips Section */}
            <div className="mt-12 max-w-3xl mx-auto">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    💡 Pro Tips for Success
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>✅ <strong>Understand, don't memorize</strong> - Know when to apply each formula</p>
                  <p>✅ <strong>Practice with examples</strong> - Work through 2-3 problems for each formula</p>
                  <p>✅ <strong>Create shortcuts</strong> - Develop your own tricks for quick calculations</p>
                  <p>✅ <strong>Time yourself</strong> - Speed comes with consistent practice</p>
                  <p>✅ <strong>Review daily</strong> - 10 minutes of revision beats 1 hour of cramming</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Formula Cards */}
            <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
              {selectedCategory.formulas.map((formula, idx) => (
                <Card 
                  key={idx} 
                  className="animate-slide-up hover:shadow-lg transition-shadow"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center text-xs text-primary-foreground font-bold`}>
                        {idx + 1}
                      </span>
                      {formula.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="bg-muted rounded-lg p-3 font-mono text-sm text-foreground">
                      {formula.formula}
                    </div>
                    {formula.example && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">Example:</span> {formula.example}
                      </p>
                    )}
                    {formula.tip && (
                      <p className="text-sm text-muted-foreground italic">
                        <span className="font-medium text-accent">💡 Tip:</span> {formula.tip}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Reference Card */}
            <div className="mt-8 text-center">
              <Button 
                variant="outline" 
                onClick={() => setSelectedCategory(null)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to All Categories
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AptitudeCheatCodes;
