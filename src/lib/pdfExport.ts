import jsPDF from 'jspdf';

interface PerformancePDFData {
  userName: string;
  stats: {
    totalQuestions: number;
    correctAnswers: number;
    overallAccuracy: number;
    totalTimeSpent: number;
    mockTestsTaken: number;
    mockTestsPassed: number;
    streakDays: number;
  };
  weakAreas: { category: string; percentage: number; correct: number; total: number }[];
  strongAreas: { category: string; percentage: number }[];
  categoryPerformance: { category: string; percentage: number; correct: number; total: number; type: string }[];
  mockTestResults: { testName: string; percentage: number; passed: boolean; completedAt: string; score: number; total: number }[];
}

const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const exportPerformancePDF = (data: PerformancePDFData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const mg = 16;
  let y = 20;

  const pageCheck = (n: number) => { if (y + n > 275) { doc.addPage(); y = 20; } };

  // Header bar
  doc.setFillColor(34, 80, 50);
  doc.rect(0, 0, pw, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Report', mg, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${data.userName} \u00B7 ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    mg, 26,
  );

  y = 48;

  // Section: Overview
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Overview', mg, y);
  y += 8;

  const rows = [
    ['Questions Solved', `${data.stats.totalQuestions}`],
    ['Correct Answers', `${data.stats.correctAnswers}`],
    ['Overall Accuracy', `${data.stats.overallAccuracy}%`],
    ['Time Practiced', fmtTime(data.stats.totalTimeSpent)],
    ['Active Days', `${data.stats.streakDays}`],
    ['Mock Tests', `${data.stats.mockTestsPassed}/${data.stats.mockTestsTaken} passed`],
  ];
  doc.setFontSize(10);
  rows.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? mg : pw / 2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, col, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, col + 52, y);
    if (i % 2 === 1) y += 7;
  });
  if (rows.length % 2 === 1) y += 7;
  y += 8;

  // Section: Weak Areas
  if (data.weakAreas.length > 0) {
    pageCheck(12 + data.weakAreas.length * 7);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 50, 50);
    doc.text(`Weak Areas (${data.weakAreas.length})`, mg, y);
    y += 7;
    doc.setFontSize(9);
    data.weakAreas.slice(0, 10).forEach((a) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(a.category, mg + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 50, 50);
      doc.text(`${a.percentage}%  (${a.correct}/${a.total})`, pw - mg - 38, y);
      y += 6;
    });
    y += 4;
  }

  // Section: Strong Areas
  if (data.strongAreas.length > 0) {
    pageCheck(12 + data.strongAreas.length * 7);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34);
    doc.text(`Strong Areas (${data.strongAreas.length})`, mg, y);
    y += 7;
    doc.setFontSize(9);
    data.strongAreas.slice(0, 10).forEach((a) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(a.category, mg + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text(`${a.percentage}%`, pw - mg - 18, y);
      y += 6;
    });
    y += 4;
  }

  // Section: Category Breakdown table
  if (data.categoryPerformance.length > 0) {
    pageCheck(18);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Category Breakdown', mg, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text('Category', mg + 2, y);
    doc.text('Type', 112, y);
    doc.text('Score', 138, y);
    doc.text('Accuracy', 164, y);
    y += 2;
    doc.setDrawColor(210, 210, 210);
    doc.line(mg, y, pw - mg, y);
    y += 4;

    doc.setFontSize(9);
    data.categoryPerformance.forEach((c) => {
      pageCheck(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const nm = c.category.length > 34 ? c.category.slice(0, 32) + '...' : c.category;
      doc.text(nm, mg + 2, y);
      doc.setFontSize(8);
      doc.text(c.type, 112, y);
      doc.setFontSize(9);
      doc.text(`${c.correct}/${c.total}`, 138, y);
      const clr = c.percentage >= 80 ? [34, 139, 34] : c.percentage >= 60 ? [180, 140, 20] : [200, 50, 50];
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(clr[0], clr[1], clr[2]);
      doc.text(`${c.percentage}%`, 167, y);
      y += 6.5;
    });
    y += 4;
  }

  // Section: Mock Test History
  if (data.mockTestResults.length > 0) {
    pageCheck(18);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Mock Test History', mg, y);
    y += 7;

    doc.setFontSize(9);
    data.mockTestResults.forEach((t) => {
      pageCheck(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(t.testName, mg + 2, y);
      doc.setFontSize(8);
      doc.text(new Date(t.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), 100, y);
      doc.setFontSize(9);
      doc.text(`${t.score}/${t.total}`, 138, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(t.passed ? 34 : 200, t.passed ? 139 : 50, t.passed ? 34 : 50);
      doc.text(`${t.percentage}%`, 167, y);
      y += 7;
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(`PrepMaster \u00B7 Page ${i} of ${pages}`, pw / 2, 290, { align: 'center' });
  }

  doc.save(`performance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
};
