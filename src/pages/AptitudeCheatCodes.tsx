import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Percent, 
  TrendingUp, 
  Clock, 
  Users, 
  Calculator,
  Layers,
  Divide,
  Triangle,
  CircleDot,
  Scale,
  Wallet,
  Droplets,
  Train,
  Binary,
  Shuffle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Target,
  TrendingDown,
  BookOpen,
  Lightbulb
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
  meaning?: string;
  steps?: string[];
  example?: string;
  tip?: string;
  commonMistakes?: string;
}

interface PerformanceData {
  category: string;
  total: number;
  correct: number;
  percentage: number;
}

interface MockTestPerformance {
  testName: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
}

const formulaCategories: FormulaCategory[] = [
  {
    id: 'percentage',
    name: 'Percentage',
    icon: Percent,
    color: 'from-blue-500 to-cyan-500',
    formulas: [
      { 
        title: 'Percentage', 
        formula: 'Percentage = (Value / Total) × 100',
        meaning: 'Percentage means "per hundred". It tells you how much of something you have out of 100 parts.',
        steps: [
          '1. Find what part you have (Value)',
          '2. Find the whole amount (Total)',
          '3. Divide Value by Total',
          '4. Multiply by 100 to get percentage'
        ],
        example: '25 out of 100 students passed. Percentage = (25/100) × 100 = 25%',
        tip: 'Think of it as "out of 100". 25% means 25 out of every 100.',
        commonMistakes: 'Don\'t confuse Value with Total. Value is the part, Total is the whole.'
      },
      { 
        title: 'Value from Percentage', 
        formula: 'Value = (Percentage × Total) / 100',
        meaning: 'Use this when you know the percentage and want to find the actual value.',
        steps: [
          '1. Take the percentage (e.g., 20%)',
          '2. Multiply it by the total',
          '3. Divide by 100'
        ],
        example: '20% of 50 = (20 × 50) / 100 = 1000/100 = 10',
        tip: 'Quick trick: 10% = divide by 10, 5% = half of 10%, 1% = divide by 100'
      },
      { 
        title: 'Percentage Increase', 
        formula: 'Increase % = ((New - Old) / Old) × 100',
        meaning: 'Measures how much something grew compared to its original value.',
        steps: [
          '1. Find the difference (New - Old)',
          '2. Divide by the OLD value (not new!)',
          '3. Multiply by 100'
        ],
        example: 'Salary went from ₹50,000 to ₹60,000. Increase = ((60000-50000)/50000) × 100 = 20%',
        tip: 'Always divide by the ORIGINAL (old) value!',
        commonMistakes: 'Common error: dividing by new value instead of old value.'
      },
      { 
        title: 'Percentage Decrease', 
        formula: 'Decrease % = ((Old - New) / Old) × 100',
        meaning: 'Measures how much something reduced compared to its original value.',
        steps: [
          '1. Find the difference (Old - New)',
          '2. Divide by the OLD value',
          '3. Multiply by 100'
        ],
        example: 'Price dropped from ₹100 to ₹80. Decrease = ((100-80)/100) × 100 = 20%',
        tip: 'Same as increase formula, just Old - New instead of New - Old'
      },
      { 
        title: 'Successive Percentage', 
        formula: 'Net % = a + b + (ab/100)',
        meaning: 'When you apply two percentage changes one after another.',
        steps: [
          '1. Take first percentage = a',
          '2. Take second percentage = b',
          '3. Apply formula: a + b + (ab/100)',
          '4. Use + for increase, - for decrease'
        ],
        example: '20% increase then 10% increase = 20 + 10 + (20×10)/100 = 32%',
        tip: 'For decrease, use negative value. E.g., 20% ↑ then 10% ↓ = 20 + (-10) + (20×-10)/100 = 8%'
      },
    ]
  },
  {
    id: 'profit-loss',
    name: 'Profit & Loss',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    formulas: [
      { 
        title: 'Profit', 
        formula: 'Profit = Selling Price (SP) - Cost Price (CP)',
        meaning: 'Profit is the extra money you earn when you sell something for MORE than you bought it.',
        steps: [
          '1. Find what you PAID (Cost Price - CP)',
          '2. Find what you SOLD for (Selling Price - SP)',
          '3. Subtract: SP - CP = Profit'
        ],
        example: 'Bought for ₹100, sold for ₹150. Profit = 150 - 100 = ₹50',
        tip: 'If SP > CP → Profit. If SP < CP → Loss'
      },
      { 
        title: 'Loss', 
        formula: 'Loss = Cost Price (CP) - Selling Price (SP)',
        meaning: 'Loss is the money you LOSE when you sell something for LESS than you bought it.',
        steps: [
          '1. Find what you PAID (CP)',
          '2. Find what you SOLD for (SP)',
          '3. Subtract: CP - SP = Loss'
        ],
        example: 'Bought for ₹100, sold for ₹80. Loss = 100 - 80 = ₹20'
      },
      { 
        title: 'Profit %', 
        formula: 'Profit % = (Profit / CP) × 100',
        meaning: 'Shows profit as a percentage of what you originally paid.',
        steps: [
          '1. Calculate Profit = SP - CP',
          '2. Divide by CP (Cost Price)',
          '3. Multiply by 100'
        ],
        example: 'CP = ₹100, SP = ₹120. Profit = ₹20. Profit% = (20/100) × 100 = 20%',
        tip: 'Always calculate percentage on CP (Cost Price), never on SP!',
        commonMistakes: 'Don\'t divide by SP! Profit % is always calculated on CP.'
      },
      { 
        title: 'Loss %', 
        formula: 'Loss % = (Loss / CP) × 100',
        meaning: 'Shows loss as a percentage of what you originally paid.',
        example: 'CP = ₹50, SP = ₹40. Loss = ₹10. Loss% = (10/50) × 100 = 20%'
      },
      { 
        title: 'SP from Profit %', 
        formula: 'SP = CP × (1 + Profit%/100)',
        meaning: 'Find selling price when you know cost and desired profit percentage.',
        steps: [
          '1. Convert profit% to decimal: 20% = 0.20',
          '2. Add 1: 1 + 0.20 = 1.20',
          '3. Multiply with CP'
        ],
        example: 'CP = ₹100, want 25% profit. SP = 100 × (1 + 25/100) = 100 × 1.25 = ₹125',
        tip: 'Quick: 25% profit means SP = CP + 25% of CP'
      },
      { 
        title: 'SP from Loss %', 
        formula: 'SP = CP × (1 - Loss%/100)',
        meaning: 'Find selling price when selling at a loss.',
        example: 'CP = ₹100, 20% loss. SP = 100 × (1 - 20/100) = 100 × 0.80 = ₹80'
      },
      { 
        title: 'Discount', 
        formula: 'Discount = Marked Price (MP) - Selling Price (SP)',
        meaning: 'MP is the "sticker price", discount is how much less you pay.',
        steps: [
          '1. MP = Original displayed price',
          '2. SP = What you actually pay',
          '3. Discount % = (Discount/MP) × 100'
        ],
        example: 'MP = ₹500, SP = ₹400. Discount = ₹100. Discount% = (100/500) × 100 = 20%',
        tip: 'Discount is calculated on MP (Marked Price), not CP!'
      },
    ]
  },
  {
    id: 'simple-interest',
    name: 'Simple Interest',
    icon: Wallet,
    color: 'from-yellow-500 to-orange-500',
    formulas: [
      { 
        title: 'Simple Interest', 
        formula: 'SI = (P × R × T) / 100',
        meaning: 'P = Principal (money invested), R = Rate per year (%), T = Time in years',
        steps: [
          '1. Identify Principal (P) - the amount you invest/borrow',
          '2. Identify Rate (R) - annual interest rate in %',
          '3. Identify Time (T) - duration in years',
          '4. Multiply P × R × T, then divide by 100'
        ],
        example: 'P = ₹1000, R = 10% per year, T = 2 years → SI = (1000 × 10 × 2) / 100 = ₹200',
        tip: 'Remember: P-R-T formula. "PRT over 100"',
        commonMistakes: 'Time must be in YEARS. 6 months = 0.5 years, 18 months = 1.5 years'
      },
      { 
        title: 'Total Amount', 
        formula: 'Amount (A) = P + SI = P(1 + RT/100)',
        meaning: 'Total amount = Principal + Interest earned',
        example: 'P = ₹1000, SI = ₹200 → Amount = ₹1200',
        tip: 'Amount is what you get back, SI is just the interest earned'
      },
      { 
        title: 'Find Principal', 
        formula: 'P = (100 × SI) / (R × T)',
        meaning: 'When you know SI, R, and T but need to find the original amount.',
        example: 'SI = ₹200, R = 10%, T = 2 yrs → P = (100 × 200)/(10 × 2) = ₹1000'
      },
      { 
        title: 'Find Rate', 
        formula: 'R = (100 × SI) / (P × T)',
        meaning: 'When you know SI, P, and T but need to find the interest rate.',
        example: 'SI = ₹200, P = ₹1000, T = 2 yrs → R = (100 × 200)/(1000 × 2) = 10%'
      },
      { 
        title: 'Find Time', 
        formula: 'T = (100 × SI) / (P × R)',
        meaning: 'When you know SI, P, and R but need to find the time period.',
        example: 'SI = ₹200, P = ₹1000, R = 10% → T = (100 × 200)/(1000 × 10) = 2 years'
      },
    ]
  },
  {
    id: 'compound-interest',
    name: 'Compound Interest',
    icon: Layers,
    color: 'from-purple-500 to-pink-500',
    formulas: [
      { 
        title: 'Compound Amount', 
        formula: 'A = P(1 + R/100)ⁿ',
        meaning: 'Interest is calculated on Principal + Previous Interest. "Interest on interest"',
        steps: [
          '1. P = Principal, R = Rate%, n = number of years',
          '2. Calculate (1 + R/100)',
          '3. Raise to power n',
          '4. Multiply by P'
        ],
        example: 'P = ₹1000, R = 10%, n = 2. A = 1000(1.1)² = 1000 × 1.21 = ₹1210',
        tip: 'Year 1: Interest on P. Year 2: Interest on (P + Year1 Interest)',
        commonMistakes: 'Don\'t confuse n (years) with months. Convert months to years first!'
      },
      { 
        title: 'Compound Interest', 
        formula: 'CI = A - P = P[(1 + R/100)ⁿ - 1]',
        meaning: 'CI is the total interest earned (Amount minus Principal)',
        example: 'A = ₹1210, P = ₹1000 → CI = ₹210',
        tip: 'CI is always MORE than SI for the same P, R, T (except for 1 year where they\'re equal)'
      },
      { 
        title: 'Half-yearly Compounding', 
        formula: 'A = P(1 + R/200)²ⁿ',
        meaning: 'Interest calculated every 6 months (twice a year)',
        steps: [
          '1. Rate becomes R/2 (half)',
          '2. Time becomes 2n (double)',
          '3. So: Rate/200, power = 2n'
        ],
        example: 'P = ₹1000, R = 10%, 1 year half-yearly = P(1 + 10/200)² = 1000(1.05)² = ₹1102.50',
        tip: 'More frequent compounding = More interest earned'
      },
      { 
        title: 'Quarterly Compounding', 
        formula: 'A = P(1 + R/400)⁴ⁿ',
        meaning: 'Interest calculated every 3 months (4 times a year)',
        tip: 'Rate ÷ 4, Time × 4'
      },
      { 
        title: 'CI vs SI Difference (2 years)', 
        formula: 'CI - SI = P(R/100)²',
        meaning: 'For exactly 2 years, this shortcut finds the difference directly.',
        example: 'P = ₹10000, R = 10%, 2 yrs → Difference = 10000(0.1)² = ₹100',
        tip: 'This only works for 2 years! For other durations, calculate both separately.'
      },
    ]
  },
  {
    id: 'time-work',
    name: 'Time & Work',
    icon: Clock,
    color: 'from-indigo-500 to-blue-500',
    formulas: [
      { 
        title: 'Work Rate (1 Day\'s Work)', 
        formula: 'If A completes work in n days → A\'s 1 day work = 1/n',
        meaning: 'Think of total work as "1 unit". If A takes 10 days, A does 1/10 of work daily.',
        steps: [
          '1. Total work = 1 (complete task)',
          '2. If someone takes n days to finish',
          '3. They do 1/n work each day'
        ],
        example: 'A finishes in 10 days → A does 1/10 work per day. In 5 days, A does 5/10 = 1/2 work',
        tip: 'More days = Less work per day. 10 days = 1/10 per day, 5 days = 1/5 per day'
      },
      { 
        title: 'Combined Work', 
        formula: '1/A + 1/B = 1/T (together)',
        meaning: 'When A and B work together, add their daily work rates.',
        steps: [
          '1. Find A\'s rate = 1/A',
          '2. Find B\'s rate = 1/B',
          '3. Combined rate = 1/A + 1/B',
          '4. Time together = 1 ÷ Combined rate'
        ],
        example: 'A = 10 days, B = 15 days. Together: 1/10 + 1/15 = 5/30 = 1/6. So T = 6 days',
        tip: 'LCM method: Take LCM of days. Divide by each to get units/day. Add units, divide LCM by total.'
      },
      { 
        title: 'Work Done', 
        formula: 'Work = Rate × Time',
        meaning: 'To find how much work is done, multiply rate by time.',
        example: 'Rate = 1/10 per day, worked 5 days → Work done = 5/10 = 1/2 (half work)',
        tip: 'Remaining work = 1 - Work done'
      },
      { 
        title: 'Men-Days Formula', 
        formula: 'M₁ × D₁ = M₂ × D₂',
        meaning: 'For the SAME work: more men = fewer days, and vice versa.',
        steps: [
          '1. M₁ = men in first scenario',
          '2. D₁ = days in first scenario',
          '3. M₂ = men in second scenario',
          '4. D₂ = days in second scenario'
        ],
        example: '5 men finish in 10 days. How many days for 10 men? 5×10 = 10×D₂ → D₂ = 5 days',
        tip: 'Extended: M₁D₁H₁ = M₂D₂H₂ (including Hours per day)'
      },
      { 
        title: 'Efficiency Ratio', 
        formula: 'If A is x times efficient as B → Time ratio = 1:x',
        meaning: 'More efficient = Less time needed. Efficiency and Time are inversely related.',
        example: 'A is 2× efficient as B. If B takes 20 days, A takes 20/2 = 10 days',
        tip: 'Efficiency ratio : Time ratio are INVERSE of each other'
      },
      { 
        title: 'Wages Distribution', 
        formula: 'Wages ∝ Work done',
        meaning: 'Divide wages in the ratio of work done by each person.',
        example: 'A did 2/5 work, B did 3/5 work. Total wages = ₹1000. A gets ₹400, B gets ₹600',
        tip: 'Work ratio = Wages ratio. More work = More pay'
      },
    ]
  },
  {
    id: 'time-distance',
    name: 'Time & Distance',
    icon: Train,
    color: 'from-red-500 to-rose-500',
    formulas: [
      { 
        title: 'Basic Formula', 
        formula: 'Distance = Speed × Time',
        meaning: 'D = S × T. The fundamental relationship between distance, speed, and time.',
        steps: [
          '1. Distance = Speed × Time',
          '2. Speed = Distance ÷ Time',
          '3. Time = Distance ÷ Speed'
        ],
        example: 'Speed = 60 km/h, Time = 2 hours → Distance = 60 × 2 = 120 km',
        tip: 'Remember as "DST Triangle": Cover what you want to find, remaining gives the formula',
        commonMistakes: 'Always check units match! km with km/h, meters with m/s'
      },
      { 
        title: 'km/h to m/s Conversion', 
        formula: 'Multiply by 5/18',
        meaning: '1 km/h = 5/18 m/s (because 1 km = 1000 m, 1 hour = 3600 seconds)',
        steps: [
          '1. Take speed in km/h',
          '2. Multiply by 5',
          '3. Divide by 18'
        ],
        example: '36 km/h = 36 × 5/18 = 10 m/s',
        tip: 'Quick check: 18 km/h = 5 m/s, 36 km/h = 10 m/s, 72 km/h = 20 m/s'
      },
      { 
        title: 'm/s to km/h Conversion', 
        formula: 'Multiply by 18/5',
        meaning: 'Reverse of above conversion.',
        example: '10 m/s = 10 × 18/5 = 36 km/h',
        tip: 'Remember: km/h number is always LARGER than m/s number'
      },
      { 
        title: 'Average Speed', 
        formula: 'Average Speed = Total Distance / Total Time',
        meaning: 'NOT the average of two speeds! Must divide total distance by total time.',
        steps: [
          '1. Find total distance traveled',
          '2. Find total time taken',
          '3. Divide: Total D ÷ Total T'
        ],
        example: '100 km at 50 km/h, then 100 km at 100 km/h. Time = 2h + 1h = 3h. Avg = 200/3 = 66.67 km/h',
        tip: 'Avg speed is NOT (50+100)/2 = 75!',
        commonMistakes: 'Never just average the speeds. Always use Total Distance ÷ Total Time'
      },
      { 
        title: 'Two Speeds (Same Distance)', 
        formula: 'Average Speed = 2S₁S₂ / (S₁ + S₂)',
        meaning: 'Special shortcut when distance covered at each speed is EQUAL.',
        example: '60 km at 30 km/h, 60 km at 60 km/h. Avg = 2×30×60/(30+60) = 3600/90 = 40 km/h',
        tip: 'This is the Harmonic Mean of two speeds. Only use when distances are equal!'
      },
    ]
  },
  {
    id: 'trains',
    name: 'Trains',
    icon: Train,
    color: 'from-slate-500 to-gray-600',
    formulas: [
      { 
        title: 'Crossing a Pole/Person', 
        formula: 'Time = Length of Train / Speed',
        meaning: 'A pole or person has negligible length. Train covers its own length to pass completely.',
        steps: [
          '1. Distance = Length of train only',
          '2. Time = Distance ÷ Speed',
          '3. Convert units if needed (m/s for seconds)'
        ],
        example: 'Train = 200m, Speed = 20 m/s → Time = 200/20 = 10 seconds',
        tip: 'Object (pole/person) length = 0. Only train length matters.'
      },
      { 
        title: 'Crossing a Platform/Bridge', 
        formula: 'Time = (Train Length + Platform Length) / Speed',
        meaning: 'Train must cover its own length PLUS the platform length to cross completely.',
        example: 'Train = 200m, Platform = 300m, Speed = 50 m/s → Time = 500/50 = 10 seconds',
        tip: 'Add both lengths! The train travels from when its front enters to when its back exits.'
      },
      { 
        title: 'Two Trains (Same Direction)', 
        formula: 'Relative Speed = S₁ - S₂ (faster - slower)',
        meaning: 'When moving in same direction, effective speed is the difference.',
        example: 'Train A = 60 km/h, Train B = 40 km/h (same dir). Relative speed = 20 km/h',
        tip: 'Time to cross = (L₁ + L₂) / Relative Speed'
      },
      { 
        title: 'Two Trains (Opposite Direction)', 
        formula: 'Relative Speed = S₁ + S₂',
        meaning: 'When moving towards each other, add the speeds.',
        example: 'Train A = 60 km/h, Train B = 40 km/h (opposite). Relative = 100 km/h',
        tip: 'They approach each other faster, so ADD speeds'
      },
      { 
        title: 'Crossing Each Other', 
        formula: 'Time = (L₁ + L₂) / Relative Speed',
        meaning: 'Total distance = sum of both train lengths. Use relative speed.',
        example: 'Trains: 200m & 300m, speeds 40 & 60 km/h (opposite). Time = 500m ÷ 100 km/h',
        tip: 'Convert everything to same units first! (either m/s or km/h)'
      },
    ]
  },
  {
    id: 'pipes-cisterns',
    name: 'Pipes & Cisterns',
    icon: Droplets,
    color: 'from-cyan-500 to-blue-500',
    formulas: [
      { 
        title: 'Inlet Pipe', 
        formula: 'Part filled in 1 hour = 1/n',
        meaning: 'Like work problems! If pipe fills tank in n hours, it fills 1/n per hour.',
        example: 'Pipe fills in 6 hours → fills 1/6 of tank per hour',
        tip: 'Inlet = FILLS the tank (positive work)'
      },
      { 
        title: 'Outlet Pipe (Leak)', 
        formula: 'Part emptied in 1 hour = 1/n',
        meaning: 'Outlet EMPTIES the tank. Treat as negative work.',
        example: 'Leak empties in 8 hours → empties 1/8 per hour',
        tip: 'Outlet = EMPTIES the tank (negative work, subtract from inlet)'
      },
      { 
        title: 'Inlet + Outlet Together', 
        formula: 'Net Rate = 1/A - 1/B',
        meaning: 'A fills, B empties. Subtract outlet from inlet rate.',
        steps: [
          '1. Inlet rate = 1/A (fills in A hours)',
          '2. Outlet rate = 1/B (empties in B hours)',
          '3. Net rate = 1/A - 1/B',
          '4. Time to fill = 1 ÷ Net rate'
        ],
        example: 'Inlet = 6 hrs, Outlet = 8 hrs. Net = 1/6 - 1/8 = 1/24. Fills in 24 hours',
        tip: 'If Net is positive → tank fills. If negative → tank empties.'
      },
      { 
        title: 'Multiple Inlets', 
        formula: '1/A + 1/B + 1/C = 1/T',
        meaning: 'Multiple pipes filling together - add all their rates.',
        example: 'Pipes: 6h, 8h, 12h. Together: 1/6 + 1/8 + 1/12 = 9/24 = 3/8. Time = 8/3 hours',
        tip: 'Same as Time & Work - treat each pipe like a worker'
      },
    ]
  },
  {
    id: 'ratio-proportion',
    name: 'Ratio & Proportion',
    icon: Scale,
    color: 'from-amber-500 to-yellow-500',
    formulas: [
      { 
        title: 'Ratio Basics', 
        formula: 'a:b means a/b',
        meaning: 'Ratio compares two quantities. a:b tells how many times a is of b.',
        example: '3:4 means for every 3 of first, there are 4 of second',
        tip: 'Ratios can be simplified like fractions. 6:8 = 3:4'
      },
      { 
        title: 'Proportion', 
        formula: 'a:b :: c:d means a/b = c/d',
        meaning: 'Four quantities are in proportion when two ratios are equal.',
        steps: [
          '1. a, d are called extremes',
          '2. b, c are called means',
          '3. Product of extremes = Product of means',
          '4. a × d = b × c'
        ],
        example: '2:3 :: 4:6 → Check: 2×6 = 3×4 = 12 ✓',
        tip: 'Cross multiply to check: a×d = b×c'
      },
      { 
        title: 'Dividing in Ratio', 
        formula: 'Each Part = Total × (Share / Sum of Ratios)',
        meaning: 'To divide something in a given ratio.',
        steps: [
          '1. Add all ratio parts: a + b',
          '2. First share = Total × a/(a+b)',
          '3. Second share = Total × b/(a+b)'
        ],
        example: '₹100 in 2:3 ratio. Sum = 5. First = 100×2/5 = ₹40. Second = ₹60',
        tip: 'Check: shares should add up to total!'
      },
      { 
        title: 'Compounding Ratios', 
        formula: '(a:b) × (c:d) = ac:bd',
        meaning: 'Multiply ratios by multiplying corresponding terms.',
        example: '2:3 and 4:5 compounded = 8:15'
      },
    ]
  },
  {
    id: 'averages',
    name: 'Averages',
    icon: Calculator,
    color: 'from-teal-500 to-green-500',
    formulas: [
      { 
        title: 'Average (Mean)', 
        formula: 'Average = Sum of all items / Number of items',
        meaning: 'The "middle" value that represents the data set.',
        steps: [
          '1. Add all values together',
          '2. Count how many values there are',
          '3. Divide sum by count'
        ],
        example: 'Average of 10, 20, 30 = (10+20+30)/3 = 60/3 = 20',
        tip: 'Sum = Average × Count. Use this to find totals!'
      },
      { 
        title: 'Sum from Average', 
        formula: 'Sum = Average × Count',
        meaning: 'Rearranged formula to find total when average is known.',
        example: 'Average of 5 numbers = 40. Sum = 5 × 40 = 200',
        tip: 'Very useful! If avg of class is 60 and 30 students, total marks = 1800'
      },
      { 
        title: 'Weighted Average', 
        formula: '(Σ value × weight) / Σ weights',
        meaning: 'When different items have different importance (weights).',
        steps: [
          '1. Multiply each value by its weight',
          '2. Add all these products',
          '3. Divide by sum of weights'
        ],
        example: 'Maths (w=3): 80, English (w=2): 70. Avg = (80×3 + 70×2)/(3+2) = 76',
        tip: 'Regular average is weighted average where all weights = 1'
      },
      { 
        title: 'Change in Average', 
        formula: 'New Avg = Old Avg ± (Change / New Count)',
        meaning: 'When a new item is added or an item is replaced.',
        example: 'Avg of 10 students = 50. One more with 72 joins. New avg = (500+72)/11 = 52',
        tip: 'For replacement: Change = (New value - Old value)'
      },
    ]
  },
  {
    id: 'mixtures',
    name: 'Mixtures & Alligation',
    icon: Shuffle,
    color: 'from-violet-500 to-purple-500',
    formulas: [
      { 
        title: 'Alligation Rule', 
        formula: 'Ratio = (d₂ - m) : (m - d₁)',
        meaning: 'Find mixing ratio when you know the prices/concentrations.',
        steps: [
          '1. d₁ = cheaper/lower value',
          '2. d₂ = costlier/higher value',
          '3. m = mean/mixture value',
          '4. Ratio of d₁:d₂ = (d₂-m):(m-d₁)'
        ],
        example: 'Mix ₹20/kg and ₹30/kg to get ₹23/kg. Ratio = (30-23):(23-20) = 7:3',
        tip: 'Draw alligation cross: cheaper top-left, costlier top-right, mean in middle'
      },
      { 
        title: 'Mean Price', 
        formula: 'Mean = (P₁Q₁ + P₂Q₂) / (Q₁ + Q₂)',
        meaning: 'Weighted average price of mixture.',
        example: '5kg at ₹20 + 3kg at ₹30 = (100+90)/8 = ₹23.75/kg'
      },
      { 
        title: 'Replacement Formula', 
        formula: 'Final Concentration = Initial × (1 - R/V)ⁿ',
        meaning: 'R = quantity replaced each time, V = total volume, n = number of operations',
        example: '20L milk, 4L replaced with water 2 times. Milk = 20(1-4/20)² = 20×0.64 = 12.8L',
        tip: 'Each replacement reduces the original substance by the same fraction'
      },
    ]
  },
  {
    id: 'ages',
    name: 'Ages',
    icon: Users,
    color: 'from-pink-500 to-rose-500',
    formulas: [
      { 
        title: 'Key Concept', 
        formula: 'Age DIFFERENCE is ALWAYS constant',
        meaning: 'If A is 5 years older than B today, A will always be 5 years older.',
        example: 'A is 30, B is 25 (diff = 5). After 10 years: A = 40, B = 35 (diff still = 5)',
        tip: 'This is the foundation of all age problems. Difference never changes!'
      },
      { 
        title: 'Past Age', 
        formula: 'Age n years ago = Present Age - n',
        example: 'Present age = 30. Age 5 years ago = 30 - 5 = 25'
      },
      { 
        title: 'Future Age', 
        formula: 'Age after n years = Present Age + n',
        example: 'Present age = 30. Age after 5 years = 30 + 5 = 35'
      },
      { 
        title: 'Ratio Method', 
        formula: 'Set up equations using present ages and given conditions',
        meaning: 'For ratio problems, let ages be in that ratio and solve.',
        steps: [
          '1. Let present ages = ax and bx (if ratio a:b)',
          '2. Set up equation with "n years ago" or "after n years"',
          '3. Solve for x'
        ],
        example: 'A:B = 3:4 now. 4 yrs ago was 2:3. Let ages = 3x, 4x. Then (3x-4):(4x-4) = 2:3. Solve to get x = 4',
        tip: 'Cross multiply: 3(3x-4) = 2(4x-4)'
      },
    ]
  },
  {
    id: 'permutation-combination',
    name: 'P & C',
    icon: Binary,
    color: 'from-fuchsia-500 to-pink-500',
    formulas: [
      { 
        title: 'Factorial', 
        formula: 'n! = n × (n-1) × (n-2) × ... × 1',
        meaning: 'n factorial is the product of all positive integers up to n.',
        steps: [
          '5! = 5 × 4 × 3 × 2 × 1 = 120',
          '0! = 1 (by definition)',
          '1! = 1'
        ],
        tip: 'Remember: 5! = 120, 4! = 24, 3! = 6, 2! = 2'
      },
      { 
        title: 'Permutation (Order Matters)', 
        formula: 'ⁿPᵣ = n! / (n-r)!',
        meaning: 'Arrangements where ORDER matters. ABC ≠ BAC',
        steps: [
          '1. n = total items available',
          '2. r = items to arrange',
          '3. Calculate n!/(n-r)!'
        ],
        example: 'Arrange 3 from 5 people. ⁵P₃ = 5!/2! = 120/2 = 60 ways',
        tip: 'Think: "Pick AND Arrange". First, second, third positions matter.'
      },
      { 
        title: 'Combination (Order Doesn\'t Matter)', 
        formula: 'ⁿCᵣ = n! / [r! × (n-r)!]',
        meaning: 'Selections where ORDER doesn\'t matter. ABC = BAC = CAB',
        example: 'Select 3 from 5 people. ⁵C₃ = 5!/(3!×2!) = 10 ways',
        tip: 'Think: "Just Pick, no arrangement". Committee selection, team selection.'
      },
      { 
        title: 'Circular Arrangement', 
        formula: '(n-1)!',
        meaning: 'Arranging n people in a circle. One position is fixed as reference.',
        example: 'Arrange 5 people around a round table = 4! = 24 ways',
        tip: 'In circle, one person is fixed, others arranged around them.'
      },
      { 
        title: 'With Repetition', 
        formula: 'n! / (p! × q! × ...)',
        meaning: 'When some items are identical.',
        example: 'Arrange MISSISSIPPI = 11!/(4!×4!×2!) (4 I\'s, 4 S\'s, 2 P\'s)',
        tip: 'Divide by factorial of each repeated item count'
      },
    ]
  },
  {
    id: 'probability',
    name: 'Probability',
    icon: CircleDot,
    color: 'from-orange-500 to-amber-500',
    formulas: [
      { 
        title: 'Basic Probability', 
        formula: 'P(Event) = Favorable Outcomes / Total Outcomes',
        meaning: 'Probability measures the chance of an event happening (0 to 1).',
        steps: [
          '1. Count favorable outcomes (what you want)',
          '2. Count total possible outcomes',
          '3. Divide favorable by total'
        ],
        example: 'Coin flip: P(Head) = 1 favorable / 2 total = 1/2 = 0.5 = 50%',
        tip: 'P = 0 means impossible, P = 1 means certain'
      },
      { 
        title: 'Complement Rule', 
        formula: 'P(not A) = 1 - P(A)',
        meaning: 'Probability of event NOT happening.',
        example: 'P(rain) = 0.3, so P(no rain) = 1 - 0.3 = 0.7',
        tip: 'Useful when it\'s easier to find P(not A)'
      },
      { 
        title: 'AND Rule (Both Events)', 
        formula: 'P(A and B) = P(A) × P(B) [if independent]',
        meaning: 'Probability of BOTH events occurring together.',
        example: 'Two coins: P(both heads) = 1/2 × 1/2 = 1/4',
        tip: '"AND" = Multiply. Both must happen.'
      },
      { 
        title: 'OR Rule (Either Event)', 
        formula: 'P(A or B) = P(A) + P(B) - P(A and B)',
        meaning: 'Probability of AT LEAST ONE event occurring.',
        example: 'P(King or Red) = 4/52 + 26/52 - 2/52 = 28/52 = 7/13',
        tip: '"OR" = Add, but subtract overlap to avoid counting twice',
        commonMistakes: 'If events are mutually exclusive (can\'t both happen), just add: P(A) + P(B)'
      },
    ]
  },
  {
    id: 'geometry',
    name: 'Geometry & Mensuration',
    icon: Triangle,
    color: 'from-lime-500 to-green-500',
    formulas: [
      { 
        title: 'Triangle Area', 
        formula: 'Area = ½ × base × height',
        meaning: 'Half of base times height.',
        example: 'Base = 10, Height = 6 → Area = ½ × 10 × 6 = 30 sq units',
        tip: 'Height must be PERPENDICULAR to base. Heron\'s: √[s(s-a)(s-b)(s-c)] where s = (a+b+c)/2'
      },
      { 
        title: 'Circle Area', 
        formula: 'Area = πr²',
        meaning: 'π (pi) ≈ 22/7 or 3.14, r = radius',
        example: 'r = 7 → Area = 22/7 × 49 = 154 sq units',
        tip: 'Diameter = 2r. If given diameter, remember to halve it first!'
      },
      { 
        title: 'Circle Circumference', 
        formula: 'C = 2πr = πd',
        meaning: 'Perimeter (boundary length) of circle.',
        example: 'r = 7 → C = 2 × 22/7 × 7 = 44 units'
      },
      { 
        title: 'Rectangle', 
        formula: 'Area = l × b, Perimeter = 2(l + b)',
        example: 'l = 10, b = 5 → Area = 50, Perimeter = 30'
      },
      { 
        title: 'Square', 
        formula: 'Area = side², Perimeter = 4 × side',
        example: 'Side = 5 → Area = 25, Perimeter = 20',
        tip: 'Diagonal of square = side × √2'
      },
      { 
        title: 'Cube', 
        formula: 'Volume = a³, Surface Area = 6a²',
        example: 'Side = 3 → Volume = 27, SA = 54'
      },
      { 
        title: 'Cylinder', 
        formula: 'Volume = πr²h, Curved SA = 2πrh, Total SA = 2πr(r+h)',
        example: 'r = 7, h = 10 → Volume = 22/7 × 49 × 10 = 1540 cubic units'
      },
      { 
        title: 'Sphere', 
        formula: 'Volume = (4/3)πr³, Surface Area = 4πr²',
        tip: 'Hemisphere: Half volume, CSA = 2πr², Total SA = 3πr²'
      },
    ]
  },
  {
    id: 'number-system',
    name: 'Number System',
    icon: Divide,
    color: 'from-sky-500 to-blue-500',
    formulas: [
      { 
        title: 'Divisibility by 2', 
        formula: 'Last digit is even (0, 2, 4, 6, 8)',
        example: '124 ✓, 567 ✗'
      },
      { 
        title: 'Divisibility by 3', 
        formula: 'Sum of digits is divisible by 3',
        example: '123 → 1+2+3 = 6 (÷3 = 2) ✓',
        tip: 'Quick: Keep adding digits until single digit, check if 3, 6, or 9'
      },
      { 
        title: 'Divisibility by 4', 
        formula: 'Last TWO digits form number divisible by 4',
        example: '1324 → 24 ÷ 4 = 6 ✓'
      },
      { 
        title: 'Divisibility by 5', 
        formula: 'Last digit is 0 or 5',
        example: '125 ✓, 340 ✓, 127 ✗'
      },
      { 
        title: 'Divisibility by 6', 
        formula: 'Divisible by BOTH 2 AND 3',
        example: '126 → Even ✓, 1+2+6=9 (÷3) ✓'
      },
      { 
        title: 'Divisibility by 9', 
        formula: 'Sum of digits is divisible by 9',
        example: '729 → 7+2+9 = 18 (÷9 = 2) ✓'
      },
      { 
        title: 'Divisibility by 11', 
        formula: 'Difference of (odd placed - even placed digits) is 0 or ÷11',
        example: '1331 → (1+3) - (3+1) = 0 ✓',
        tip: 'Count positions from right: 1st, 3rd, 5th are odd; 2nd, 4th are even'
      },
      { 
        title: 'HCF × LCM Rule', 
        formula: 'HCF × LCM = Product of two numbers',
        example: 'Numbers: 12, 18. HCF=6, LCM=36. Check: 6×36 = 216 = 12×18 ✓',
        tip: 'Works only for TWO numbers, not three or more!'
      },
      { 
        title: 'Sum of n Natural Numbers', 
        formula: 'S = n(n+1)/2',
        example: 'Sum of 1 to 10 = 10×11/2 = 55'
      },
      { 
        title: 'Sum of Squares', 
        formula: 'S = n(n+1)(2n+1)/6',
        meaning: '1² + 2² + 3² + ... + n²',
        example: 'Sum of 1² to 5² = 5×6×11/6 = 55'
      },
    ]
  },
];

const AptitudeCheatCodes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<FormulaCategory | null>(null);
  const [activeTab, setActiveTab] = useState('formulas');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [mockTestPerformance, setMockTestPerformance] = useState<MockTestPerformance[]>([]);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && activeTab === 'report') {
      fetchPerformanceData();
    }
  }, [user, activeTab]);

  const fetchPerformanceData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch aptitude progress with categories
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('question_id, is_correct, question_type')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Fetch aptitude questions to get categories
      const { data: aptitudeQuestions, error: aqError } = await supabase
        .from('aptitude_questions_public')
        .select('id, category');

      if (aqError) throw aqError;

      // Fetch technical MCQ questions for categories
      const { data: techQuestions, error: tqError } = await supabase
        .from('technical_mcq_questions_public')
        .select('id, category');

      if (tqError) throw tqError;

      // Fetch mock test results
      const { data: mockResults, error: mockError } = await supabase
        .from('mock_test_results')
        .select(`
          score,
          total_questions,
          percentage,
          passed,
          completed_at,
          mock_tests (name)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (mockError) throw mockError;

      // Process category-wise performance
      const categoryMap = new Map<string, { total: number; correct: number }>();

      progressData?.forEach((p) => {
        let category = 'General';
        
        if (p.question_type === 'aptitude') {
          const q = aptitudeQuestions?.find(aq => aq.id === p.question_id);
          category = q?.category || 'Aptitude General';
        } else if (p.question_type === 'technical_mcq') {
          const q = techQuestions?.find(tq => tq.id === p.question_id);
          category = q?.category || 'Technical General';
        } else if (p.question_type === 'mock_test') {
          category = 'Mock Test';
        }

        const current = categoryMap.get(category) || { total: 0, correct: 0 };
        categoryMap.set(category, {
          total: current.total + 1,
          correct: current.correct + (p.is_correct ? 1 : 0)
        });
      });

      const performanceArray: PerformanceData[] = Array.from(categoryMap.entries()).map(([cat, data]) => ({
        category: cat,
        total: data.total,
        correct: data.correct,
        percentage: Math.round((data.correct / data.total) * 100)
      }));

      // Sort by percentage (ascending) to show weak areas first
      performanceArray.sort((a, b) => a.percentage - b.percentage);
      setPerformanceData(performanceArray);

      // Identify weak areas (below 60%)
      const weak = performanceArray
        .filter(p => p.percentage < 60 && p.total >= 3)
        .map(p => p.category);
      setWeakAreas(weak);

      // Process mock test results
      const mockPerf: MockTestPerformance[] = (mockResults || []).map((r: any) => ({
        testName: r.mock_tests?.name || 'Unknown Test',
        score: r.score,
        total: r.total_questions,
        percentage: r.percentage,
        passed: r.passed,
        completedAt: r.completed_at
      }));
      setMockTestPerformance(mockPerf);

    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (percentage >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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
              {selectedCategory ? 'Detailed formulas & explanations' : 'Master formulas + Track your progress'}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!selectedCategory ? (
          <>
            {/* Tabs for Formulas and Report */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="formulas" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Formula Cheat Codes
                </TabsTrigger>
                <TabsTrigger value="report" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Performance Report
                </TabsTrigger>
              </TabsList>

              <TabsContent value="formulas">
                {/* Category Selection */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    📚 Formula Categories
                  </h2>
                  <p className="text-muted-foreground">
                    Select a category to view detailed formulas with step-by-step explanations
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
              </TabsContent>

              <TabsContent value="report">
                {/* Performance Report */}
                {!user ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Login Required</h3>
                      <p className="text-muted-foreground mb-4">
                        Please login to view your performance report
                      </p>
                      <Button onClick={() => navigate('/auth')}>Login</Button>
                    </CardContent>
                  </Card>
                ) : loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading your performance data...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Weak Areas Alert */}
                    {weakAreas.length > 0 && (
                      <Card className="bg-red-500/10 border-red-500/30">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                            <TrendingDown className="w-5 h-5" />
                            Areas Needing Improvement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            Based on your practice and mock test performance, focus more on these areas:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {weakAreas.map((area, idx) => (
                              <span 
                                key={idx}
                                className="px-3 py-1.5 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full text-sm font-medium"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4 p-3 bg-background/50 rounded-lg">
                            <p className="text-sm flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Tip:</strong> Review the formulas for these categories above, 
                                then practice more questions in the Aptitude MCQs section.
                              </span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Category-wise Performance */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary" />
                          Category-wise Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {performanceData.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No practice data yet. Start practicing to see your performance!</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => navigate('/aptitude')}
                            >
                              Start Practicing
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {performanceData.map((item, idx) => (
                              <div key={idx} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getPerformanceIcon(item.percentage)}
                                    <span className="font-medium">{item.category}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">
                                      {item.correct}/{item.total} correct
                                    </span>
                                    <span className={`font-bold ${getPerformanceColor(item.percentage)}`}>
                                      {item.percentage}%
                                    </span>
                                  </div>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${getProgressColor(item.percentage)} transition-all duration-500`}
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Mock Test History */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          Mock Test History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {mockTestPerformance.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No mock tests attempted yet. Take a mock test to track progress!</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => navigate('/mock-tests')}
                            >
                              Take Mock Test
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {mockTestPerformance.map((test, idx) => (
                              <div 
                                key={idx} 
                                className={`p-4 rounded-lg border ${test.passed ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{test.testName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(test.completedAt).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-lg font-bold ${test.passed ? 'text-green-500' : 'text-red-500'}`}>
                                      {test.percentage}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {test.score}/{test.total}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${test.passed ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                                    {test.passed ? '✓ Passed' : '✗ Failed'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Performance Legend */}
                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Excellent (≥80%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Good (60-79%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Needs Work (&lt;60%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <>
            {/* Formula Cards with Detailed Explanations */}
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {selectedCategory.formulas.map((formula, idx) => (
                <Card 
                  key={idx} 
                  className="animate-slide-up hover:shadow-lg transition-shadow"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center text-sm text-primary-foreground font-bold`}>
                        {idx + 1}
                      </span>
                      {formula.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Main Formula */}
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 font-mono text-base text-foreground border border-primary/20">
                      {formula.formula}
                    </div>

                    {/* What it means */}
                    {formula.meaning && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
                          📖 What it means:
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {formula.meaning}
                        </p>
                      </div>
                    )}

                    {/* Step by step */}
                    {formula.steps && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-secondary flex items-center gap-1">
                          📝 Step by Step:
                        </h4>
                        <ul className="space-y-1">
                          {formula.steps.map((step, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-secondary font-medium">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Example */}
                    {formula.example && (
                      <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">📌 Example:</span>
                        <p className="text-sm text-foreground mt-1">{formula.example}</p>
                      </div>
                    )}

                    {/* Pro tip */}
                    {formula.tip && (
                      <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                        <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">💡 Pro Tip:</span>
                        <p className="text-sm text-foreground mt-1">{formula.tip}</p>
                      </div>
                    )}

                    {/* Common mistakes */}
                    {formula.commonMistakes && (
                      <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ Common Mistake:</span>
                        <p className="text-sm text-foreground mt-1">{formula.commonMistakes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Back Button */}
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
