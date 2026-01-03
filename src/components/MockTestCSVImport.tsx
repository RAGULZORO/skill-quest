import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileText, ArrowRight, Info, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ParsedMockTest {
  data: Record<string, any>;
  rowNumber: number;
  errors: string[];
}

interface MockTestCSVImportProps {
  onImportComplete?: (count: number) => void;
  onRefresh?: () => Promise<void>;
}

export const MockTestCSVImport: React.FC<MockTestCSVImportProps> = ({ onImportComplete, onRefresh }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedTests, setParsedTests] = useState<ParsedMockTest[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  const getCsvTemplate = () => {
    return `name,difficulty,description,total_questions,time_minutes,aptitude_questions,technical_questions,is_active
Level 1 Assessment,easy,Basic aptitude and coding test for beginners,20,30,15,5,true
Level 2 Challenge,medium,Intermediate level assessment with mixed questions,25,40,18,7,true
Level 3 Expert,hard,Advanced assessment for experienced candidates,30,45,20,10,true`;
  };

  const downloadTemplate = () => {
    const template = getCsvTemplate();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(template));
    element.setAttribute('download', 'mock_tests_template.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: 'Downloaded', description: 'Mock tests template downloaded' });
  };

  const parseCSV = (fileContent: string): string[][] => {
    const lines = fileContent.split('\n');
    const rows: string[][] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const fields: string[] = [];
      let currentField = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }

      if (currentField || line.endsWith(',')) {
        fields.push(currentField.trim());
      }

      if (fields.some(f => f)) {
        rows.push(fields.map(f => f.replace(/^"|"$/g, '')));
      }
    }

    return rows;
  };

  const validateMockTest = (data: Record<string, any>, rowNumber: number): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.toString().trim() === '') {
      errors.push(`Row ${rowNumber}: Missing "name" field`);
    }

    if (!data.difficulty || data.difficulty.toString().trim() === '') {
      errors.push(`Row ${rowNumber}: Missing "difficulty" field`);
    } else {
      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!validDifficulties.includes(data.difficulty.toString().toLowerCase().trim())) {
        errors.push(`Row ${rowNumber}: Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`);
      }
    }

    const totalQuestions = parseInt(data.total_questions?.toString() || '');
    if (isNaN(totalQuestions) || totalQuestions <= 0) {
      errors.push(`Row ${rowNumber}: "total_questions" must be a positive number`);
    }

    const timeMinutes = parseInt(data.time_minutes?.toString() || '');
    if (isNaN(timeMinutes) || timeMinutes <= 0) {
      errors.push(`Row ${rowNumber}: "time_minutes" must be a positive number`);
    }

    const aptitudeQuestions = parseInt(data.aptitude_questions?.toString() || '0');
    if (isNaN(aptitudeQuestions) || aptitudeQuestions < 0) {
      errors.push(`Row ${rowNumber}: "aptitude_questions" must be a non-negative number`);
    }

    const technicalQuestions = parseInt(data.technical_questions?.toString() || '0');
    if (isNaN(technicalQuestions) || technicalQuestions < 0) {
      errors.push(`Row ${rowNumber}: "technical_questions" must be a non-negative number`);
    }

    return errors;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file',
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setParsedTests([]);
      setValidationErrors([]);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      toast({
        title: 'No File',
        description: 'Please select a CSV file first',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const fileContent = await file.text();
      setProgress(30);

      const rows = parseCSV(fileContent);

      if (rows.length === 0) {
        setValidationErrors(['CSV file is empty']);
        setIsLoading(false);
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      if (dataRows.length === 0) {
        setValidationErrors(['CSV file has no data rows (only headers)']);
        setIsLoading(false);
        return;
      }

      setProgress(60);

      const tests: ParsedMockTest[] = [];
      const globalErrors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2;

        const data: Record<string, any> = {};
        for (let j = 0; j < headers.length; j++) {
          const headerKey = headers[j].toLowerCase().trim();
          data[headerKey] = row[j] || '';
        }

        if (Object.values(data).every(v => !v || v.toString().trim() === '')) {
          continue;
        }

        const errors = validateMockTest(data, rowNumber);

        tests.push({
          data,
          rowNumber,
          errors
        });

        if (errors.length > 0) {
          globalErrors.push(...errors);
        }
      }

      setParsedTests(tests);
      setValidationErrors(globalErrors);

      if (globalErrors.length > 0) {
        toast({
          title: 'Validation Errors',
          description: `Found ${globalErrors.length} error(s). Please review below.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Validation Successful',
          description: `All ${tests.length} mock tests are valid and ready to import`,
          variant: 'default'
        });
      }

      setProgress(100);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedTests.length === 0) {
      toast({
        title: 'No Valid Tests',
        description: 'Please validate the CSV file first and fix any errors',
        variant: 'destructive'
      });
      return;
    }

    const validTests = parsedTests.filter(t => t.errors.length === 0);

    if (validTests.length === 0) {
      toast({
        title: 'No Valid Tests',
        description: 'All tests have errors. Please fix them before importing.',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Not Authenticated',
        description: 'You must be logged in to import mock tests',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setImportProgress({ current: 0, total: validTests.length });

    try {
      const testsToInsert = validTests.map(t => {
        const data = t.data;
        const isActive = data.is_active?.toString().toLowerCase() === 'true' || 
                         data.is_active?.toString() === '1' ||
                         data.is_active === true;

        return {
          name: data.name.toString().trim(),
          difficulty: data.difficulty.toString().toLowerCase().trim(),
          description: data.description?.toString().trim() || null,
          total_questions: parseInt(data.total_questions?.toString() || '20'),
          time_minutes: parseInt(data.time_minutes?.toString() || '30'),
          aptitude_questions: parseInt(data.aptitude_questions?.toString() || '0'),
          technical_questions: parseInt(data.technical_questions?.toString() || '0'),
          is_active: isActive,
          created_by: user.id
        };
      });

      const chunkSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < testsToInsert.length; i += chunkSize) {
        const chunk = testsToInsert.slice(i, i + chunkSize);

        try {
          const { error } = await supabase
            .from('mock_tests')
            .insert(chunk);

          if (error) {
            console.error('Insert error:', error);
            errorCount += chunk.length;
          } else {
            successCount += chunk.length;
          }
        } catch (err) {
          console.error('Insert exception:', err);
          errorCount += chunk.length;
        }

        for (let j = 0; j < chunk.length; j++) {
          setImportProgress({
            current: Math.min(i + j + 1, validTests.length),
            total: validTests.length
          });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${successCount} mock test${successCount !== 1 ? 's' : ''}!`,
          variant: 'default'
        });

        if (onRefresh) {
          await onRefresh();
        }

        if (onImportComplete) {
          onImportComplete(successCount);
        }

        setFile(null);
        setParsedTests([]);
        setValidationErrors([]);
        setImportProgress(null);
      }

      if (errorCount > 0) {
        toast({
          title: 'Partial Import',
          description: `Imported ${successCount} tests, but ${errorCount} failed. Please check the errors.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: `Failed to import mock tests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validCount = parsedTests.filter(t => t.errors.length === 0).length;
  const invalidCount = parsedTests.length - validCount;

  const formatColumns = ['name', 'difficulty', 'description', 'total_questions', 'time_minutes', 'aptitude_questions', 'technical_questions', 'is_active'];

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <ClipboardList className="h-6 w-6 text-primary" />
          Bulk Import Mock Tests
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Upload a CSV file to add multiple mock test configurations at once.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Quick Start Guide */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-3">Quick Start Guide</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Download Template</p>
                    <p className="text-xs text-muted-foreground">Get the correct CSV format</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Fill Your Data</p>
                    <p className="text-xs text-muted-foreground">Add your test configs in Excel</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Upload & Import</p>
                    <p className="text-xs text-muted-foreground">Validate and import tests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSV Format Requirements */}
        <Card className="bg-muted/30 border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Required CSV Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">CSV Columns (in order):</p>
              <div className="flex flex-wrap gap-2">
                {formatColumns.map((col, idx) => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-mono font-semibold border border-primary/20">
                      {col}
                    </span>
                    {idx < formatColumns.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5">Difficulty Levels:</p>
                <div className="flex gap-1.5">
                  {['easy', 'medium', 'hard'].map(diff => (
                    <span key={diff} className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground">
                      {diff}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5">is_active Values:</p>
                <div className="flex gap-1.5">
                  {['true', 'false'].map(val => (
                    <span key={val} className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <div className={`border-2 border-dashed rounded-xl p-8 transition-all ${
          file
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}>
          <div className="flex flex-col items-center gap-6">
            {!file ? (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Upload className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    Select Your CSV File
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Upload a CSV file containing your mock test configurations.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {file.name}
                  </p>
                  <p className="text-sm text-success font-medium">
                    File selected and ready to validate
                  </p>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-3 justify-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="mock-test-csv-upload"
              />
              <Button
                size="lg"
                variant={file ? "outline" : "default"}
                onClick={() => document.getElementById('mock-test-csv-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? 'Change File' : 'Browse Files'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </div>

        {/* Loading/Progress */}
        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {importProgress
                  ? `Importing... ${importProgress.current}/${importProgress.total}`
                  : 'Validating...'}
              </span>
            </div>
            <Progress value={importProgress ? (importProgress.current / importProgress.total) * 100 : progress} />
          </div>
        )}

        {/* Validation Results */}
        {parsedTests.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">{validCount} Valid</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium">{invalidCount} Invalid</span>
                  </div>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                Total: {parsedTests.length} mock tests
              </span>
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {validationErrors.slice(0, 10).map((error, idx) => (
                      <p key={idx} className="text-sm">{error}</p>
                    ))}
                    {validationErrors.length > 10 && (
                      <p className="text-sm font-medium">...and {validationErrors.length - 10} more errors</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            onClick={handleValidate}
            disabled={!file || isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading && !importProgress ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Validate CSV
          </Button>
          <Button
            onClick={handleImport}
            disabled={validCount === 0 || isLoading}
            className="flex-1"
          >
            {isLoading && importProgress ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import {validCount > 0 ? `${validCount} Tests` : 'Tests'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
