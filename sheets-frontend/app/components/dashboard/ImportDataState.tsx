import React, { useState } from 'react';
import { Upload, FileText, Users, ArrowRight, AlertCircle, X, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

interface ImportDataStateProps {
  className: string;
  onManualInput: () => void;
  onImportComplete: (data: any) => void;
  onCancel: () => void;
}

export const ImportDataState: React.FC<ImportDataStateProps> = ({
  className,
  onManualInput,
  onImportComplete,
  onCancel,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setError('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFiles(Array.from(e.target.files));
      setError('');
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setError('');
  };

  const isDateColumn = (header: string): boolean => {
    const datePatterns = [
      /^\d{1,2}$/,
      /^\d{1,2}\/\d{1,2}$/,
      /^\d{1,2}-\d{1,2}$/,
      /^\d{4}-\d{1,2}-\d{1,2}$/,
      /^date/i,
      /^day/i,
    ];
    return datePatterns.some(pattern => pattern.test(header.trim()));
  };

  const isSrNoColumn = (header: string): boolean => {
    const lower = header.toLowerCase().replace(/\s+/g, '');
    return lower.includes('sr') || 
           lower.includes('serial') || 
           lower.includes('no.') ||
           lower === 'no' ||
           lower === 'sno' ||
           lower === 's.no' ||
           lower === 'srno' ||
           lower === 'serialno' ||
           lower === 'serialnumber';
  };

  const processCSV = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('Error parsing CSV file'));
            return;
          }

          const data = results.data as any[];
          if (data.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          const allHeaders = Object.keys(data[0]);
          
          let dateColumnIndex = -1;
          for (let i = 0; i < allHeaders.length; i++) {
            if (isDateColumn(allHeaders[i])) {
              dateColumnIndex = i;
              break;
            }
          }
          
          const dataHeaders = dateColumnIndex >= 0 
            ? allHeaders.slice(0, dateColumnIndex)
            : allHeaders;
          
          const filteredHeaders = dataHeaders.filter(h => !isSrNoColumn(h));
          
          const nameColumns = ['name', 'student_name', 'student', 'full_name', 'studentname', 'student name'];
          const rollColumns = ['roll_no', 'roll_number', 'rollno', 'roll', 'id', 'student_id', 'roll no', 'roll number'];
          
          let nameColumn = filteredHeaders.find(h => 
            nameColumns.some(nc => h.toLowerCase().replace(/\s+/g, '_') === nc)
          );
          let rollColumn = filteredHeaders.find(h => 
            rollColumns.some(rc => h.toLowerCase().replace(/\s+/g, '_') === rc)
          );
          
          if (!nameColumn && filteredHeaders.length > 0) {
            nameColumn = filteredHeaders[0];
          }
          
          const additionalColumns = filteredHeaders.filter(h => 
            h !== nameColumn && h !== rollColumn
          );
          
          const customColumns = additionalColumns.map((col, idx) => ({
            id: `col_${Date.now()}_${idx}`,
            label: col.split(/[_\s]+/).map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' '),
            type: 'text' as const
          }));

          const students = data.map((row, idx) => {
            const student: any = {
              id: Date.now() + idx,
              name: nameColumn ? (row[nameColumn] || '').toString().trim() : '',
              rollNo: rollColumn ? (row[rollColumn] || '').toString().trim() : '',
              attendance: {} as Record<string, 'P' | 'A' | 'L' | undefined>
            };

            additionalColumns.forEach((col) => {
              const customCol = customColumns.find(cc => {
                const ccLabel = cc.label.toLowerCase().replace(/\s+/g, '_');
                const colLabel = col.toLowerCase().replace(/\s+/g, '_');
                return ccLabel === colLabel;
              });
              if (customCol && row[col]) {
                student[customCol.id] = row[col].toString().trim();
              }
            });

            return student;
          }).filter(s => s.name);

          resolve({
            students,
            customColumns
          });
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  };

  const processExcel = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csvData = XLSX.utils.sheet_to_csv(firstSheet);
          
          const blob = new Blob([csvData], { type: 'text/csv' });
          const csvFile = new File([blob], file.name.replace(/\.xlsx?$/, '.csv'), { type: 'text/csv' });
          const result = await processCSV(csvFile);
          resolve(result);
        } catch (error: any) {
          reject(new Error(`Failed to process Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsBinaryString(file);
    });
  };

  const processTextFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('Text file is empty'));
            return;
          }

          const firstLine = lines[0];
          const delimiter = firstLine.includes('\t') ? '\t' : 
                          firstLine.includes(',') ? ',' : 
                          firstLine.includes(';') ? ';' : ' ';

          const data = lines.map(line => line.split(delimiter).map(cell => cell.trim()));
          
          const hasHeaders = data[0].some(cell => isNaN(Number(cell)));
          const allHeaders = hasHeaders ? data[0] : ['Name', 'Roll No'];
          const rows = hasHeaders ? data.slice(1) : data;

          let dateColumnIndex = -1;
          for (let i = 0; i < allHeaders.length; i++) {
            if (isDateColumn(allHeaders[i])) {
              dateColumnIndex = i;
              break;
            }
          }
          
          const dataHeaders = dateColumnIndex >= 0 
            ? allHeaders.slice(0, dateColumnIndex)
            : allHeaders;
          
          const filteredHeaders = dataHeaders.filter(h => !isSrNoColumn(h));

          const nameColumn = 0;
          const rollColumn = filteredHeaders.length > 1 ? 1 : -1;
          const additionalColumns = filteredHeaders.slice(rollColumn >= 0 ? 2 : 1);

          const customColumns = additionalColumns.map((col, idx) => ({
            id: `col_${Date.now()}_${idx}`,
            label: col.charAt(0).toUpperCase() + col.slice(1),
            type: 'text' as const
          }));

          const students = rows.map((row, idx) => {
            const student: any = {
              id: Date.now() + idx,
              name: row[nameColumn] || '',
              rollNo: rollColumn >= 0 ? (row[rollColumn] || '') : '',
              attendance: {} as Record<string, 'P' | 'A' | 'L' | undefined>
            };

            additionalColumns.forEach((col, colIdx) => {
              const customCol = customColumns[colIdx];
              const dataIndex = rollColumn >= 0 ? colIdx + 2 : colIdx + 1;
              if (customCol && row[dataIndex]) {
                student[customCol.id] = row[dataIndex];
              }
            });

            return student;
          }).filter(s => s.name);

          resolve({
            students,
            customColumns
          });
        } catch (error: any) {
          reject(new Error(`Failed to process text file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select a file to import');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const file = selectedFiles[0];
      let result;

      if (file.name.endsWith('.csv')) {
        result = await processCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        result = await processExcel(file);
      } else if (file.name.endsWith('.txt')) {
        result = await processTextFile(file);
      } else {
        throw new Error('Unsupported file format');
      }

      if (result.students.length === 0) {
        throw new Error('No valid student data found in file');
      }

      setTimeout(() => {
        onImportComplete(result);
      }, 500);
      
    } catch (error: any) {
      setError(error.message || 'Failed to import data');
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Setup {className}</h2>
          <p className="text-slate-600">Choose how you'd like to add your student data</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={onManualInput}
            className="group bg-white rounded-2xl p-8 shadow-md border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-xl transition-all text-left cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Manual Input</h3>
            <p className="text-slate-600 mb-4">
              Start with an empty class and add students one by one.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold group-hover:gap-3 transition-all">
              <span>Start Adding Students</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>

          <div className="bg-white rounded-2xl p-8 shadow-md border-2 border-teal-200">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl flex items-center justify-center mb-5">
              <Upload className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Import Data</h3>
            <p className="text-slate-600 mb-4">
              Upload CSV, Excel, or text file. Sr No and date columns excluded automatically.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-md border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Upload Your File</h4>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">Import Rules</p>
                <p className="text-sm text-blue-700">
                  • Sr No/Serial Number columns are automatically ignored<br/>
                  • Date columns (1, 2, 3... or dates) are automatically detected and excluded<br/>
                  • Only student data columns are imported<br/>
                  • All other columns added as custom fields
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {processing && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-emerald-700 font-medium">Processing your file...</p>
              </div>
            </div>
          )}

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive 
                ? 'border-teal-400 bg-teal-50' 
                : 'border-slate-300 hover:border-teal-300 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={processing}
            />
            <div className="pointer-events-none">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-900 mb-2">
                {dragActive ? 'Drop your files here' : 'Drag and drop your files here'}
              </p>
              <p className="text-sm text-slate-600 mb-4">or click to browse</p>
              <p className="text-xs text-slate-500">
                Supported: CSV, Excel (.xlsx, .xls), Text (.txt)
              </p>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h5 className="text-sm font-semibold text-slate-700 mb-3">Selected Files ({selectedFiles.length})</h5>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    {!processing && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4 text-rose-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedFiles.length === 0 || processing}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Import Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};