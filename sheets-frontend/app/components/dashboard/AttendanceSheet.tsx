
'use client';

import React, { useState } from 'react';
import { Plus, X, Users, Trash2, Settings, Download, FileText, FileSpreadsheet, File, Check, Edit2, QrCode } from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface CustomColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

interface Student {
  id: number;
  rollNo: string;
  name: string;
  attendance: Record<string, 'P' | 'A' | 'L' | undefined>;
  [key: string]: any;
}

interface Class {
  id: number;
  name: string;
  students: Student[];
  customColumns: CustomColumn[];
  thresholds?: AttendanceThresholds;
}

interface AttendanceThresholds {
  excellent: number;
  good: number;
  moderate: number;
  atRisk: number;
}

interface AttendanceSheetProps {
  activeClass: Class;
  currentMonth: number;
  currentYear: number;
  onAddStudent: () => void;
  onUpdateStudent: (studentId: number, field: string, value: any) => void;
  onDeleteStudent: (studentId: number) => void;
  onToggleAttendance: (studentId: number, day: number) => void;
  onAddColumn: () => void;
  onDeleteColumn: (columnId: string) => void;
  defaultThresholds: AttendanceThresholds;
  onOpenSettings: () => void;
  onUpdateClassName: (newName: string) => void;
  onOpenQRAttendance: () => void; // ✅ ADDED
}

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  activeClass,
  currentMonth,
  currentYear,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onToggleAttendance,
  onAddColumn,
  onDeleteColumn,
  defaultThresholds,
  onOpenSettings,
  onUpdateClassName,
  onOpenQRAttendance,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [editedClassName, setEditedClassName] = useState(activeClass.name);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [exportOnlyClassDays, setExportOnlyClassDays] = useState(true);
  const [pendingExportType, setPendingExportType] = useState<'csv' | 'excel' | null>(null);

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const thresholds = activeClass.thresholds || defaultThresholds;
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });

  const calculateAttendance = (student: Student): string => {
    let present = 0;
    let total = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
      const status = student.attendance[dateKey];
      if (status) {
        total++;
        if (status === 'P' || status === 'L') present++;
      }
    }

    const percentage = total > 0 ? (present / total) * 100 : 0;
    return percentage.toFixed(3);
  };

  const getRiskLevel = (percentage: string) => {
    const pct = parseFloat(percentage);
    if (pct >= thresholds.excellent) {
      return { label: 'Excellent', color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50' };
    }
    if (pct >= thresholds.good) {
      return { label: 'Good', color: 'text-blue-700', dot: 'bg-blue-500', bg: 'bg-blue-50' };
    }
    if (pct >= thresholds.moderate) {
      return { label: 'Moderate', color: 'text-amber-700', dot: 'bg-amber-500', bg: 'bg-amber-50' };
    }
    return { label: 'At Risk', color: 'text-rose-700', dot: 'bg-rose-500', bg: 'bg-rose-50' };
  };

  const handleClassNameSave = () => {
    if (editedClassName.trim() && editedClassName !== activeClass.name) {
      onUpdateClassName(editedClassName.trim());
    }
    setIsEditingClassName(false);
  };

  const handleClassNameCancel = () => {
    setEditedClassName(activeClass.name);
    setIsEditingClassName(false);
  };

  const prepareExportData = () => {
    // Build headers in the correct order
    const headers: string[] = [];

    // 1. Sr No
    headers.push('Sr No');

    // 2. Student Name
    headers.push('Student Name');

    // 3. Roll No (if any student has it)
    const hasRollNo = activeClass.students.some(s => s.rollNo && s.rollNo.trim() !== '');
    if (hasRollNo) {
      headers.push('Roll No');
    }

    // 4. Custom columns in order
    activeClass.customColumns.forEach(col => {
      headers.push(col.label);
    });

    // 5. Determine which days to include
    const daysToInclude: number[] = [];
    if (exportOnlyClassDays) {
      // Only include days where at least one student has attendance marked
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
        const hasAttendance = activeClass.students.some(student => student.attendance[dateKey]);
        if (hasAttendance) {
          daysToInclude.push(day);
        }
      }
    } else {
      // Include all days in the month
      for (let day = 1; day <= daysInMonth; day++) {
        daysToInclude.push(day);
      }
    }

    // Add day headers
    daysToInclude.forEach(day => {
      headers.push(`${day}`);
    });

    // 6. Attendance %, Status, and Totals at the end
    headers.push('Attendance %');
    headers.push('Status');
    headers.push('Total Present');
    headers.push('Total Absent');
    headers.push('Total Late');

    // Build rows
    const rows = activeClass.students.map((student, index) => {
      const row: any = {};

      // Sr No
      row['Sr No'] = index + 1;

      // Student Name
      row['Student Name'] = student.name || '';

      // Roll No (if applicable)
      if (hasRollNo) {
        row['Roll No'] = student.rollNo || '';
      }

      // Custom columns
      activeClass.customColumns.forEach(col => {
        row[col.label] = student[col.id] || '';
      });

      // Calculate attendance stats
      let present = 0;
      let absent = 0;
      let late = 0;

      // Day columns
      daysToInclude.forEach(day => {
        const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
        const status = student.attendance[dateKey];
        row[`${day}`] = status || '';

        if (status === 'P') present++;
        else if (status === 'A') absent++;
        else if (status === 'L') late++;
      });

      // Calculate percentage
      const total = present + absent + late;
      const attendancePercent = total > 0 ? ((present + late) / total * 100).toFixed(3) : '0.000';

      // Add final columns
      row['Attendance %'] = attendancePercent;
      row['Status'] = getRiskLevel(attendancePercent).label;
      row['Total Present'] = present;
      row['Total Absent'] = absent;
      row['Total Late'] = late;

      return row;
    });

    return { headers, rows, classDaysCount: daysToInclude.length };
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const { headers, rows } = prepareExportData();

      // Ensure rows maintain the correct column order
      const orderedRows = rows.map(row => {
        const orderedRow: any = {};
        headers.forEach(header => {
          orderedRow[header] = row[header];
        });
        return orderedRow;
      });

      const csv = Papa.unparse(orderedRows, {
        quotes: true,
        header: true,
        columns: headers // Explicitly specify column order
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${activeClass.name}_${monthName.replace(' ', '_')}_Attendance.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setShowExportMenu(false);
        setShowExportOptions(false);
        setPendingExportType(null);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export CSV file');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const { headers, rows } = prepareExportData();

      // Ensure rows maintain the correct column order
      const orderedRows = rows.map(row => {
        const orderedRow: any = {};
        headers.forEach(header => {
          orderedRow[header] = row[header];
        });
        return orderedRow;
      });

      const ws = XLSX.utils.json_to_sheet(orderedRows, { header: headers });
      const wb = XLSX.utils.book_new();

      // Set column widths
      const colWidths: any[] = [];
      headers.forEach(header => {
        if (header === 'Sr No') {
          colWidths.push({ wch: 8 });
        } else if (header === 'Student Name') {
          colWidths.push({ wch: 25 });
        } else if (header === 'Roll No') {
          colWidths.push({ wch: 15 });
        } else if (header === 'Attendance %') {
          colWidths.push({ wch: 13 });
        } else if (header === 'Status') {
          colWidths.push({ wch: 12 });
        } else if (header.startsWith('Total')) {
          colWidths.push({ wch: 12 });
        } else if (!isNaN(Number(header))) {
          // Day columns
          colWidths.push({ wch: 7 });
        } else {
          // Custom columns
          colWidths.push({ wch: 15 });
        }
      });

      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `${activeClass.name}_${monthName.replace(' ', '_')}_Attendance.xlsx`);

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setShowExportMenu(false);
        setShowExportOptions(false);
        setPendingExportType(null);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export Excel file');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const { headers, rows, classDaysCount } = prepareExportData();

      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 8;
      const availableWidth = pageWidth - (margin * 2);

      // Title section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${activeClass.name}`, pageWidth / 2, 10, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Attendance Sheet - ${monthName}`, pageWidth / 2, 16, { align: 'center' });

      pdf.setFontSize(7);
      pdf.text(`Class ID: ${activeClass.id}  |  Total Students: ${activeClass.students.length}  |  Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 21, { align: 'center' });

      const tableData = rows.map(row => headers.map(header => {
        const value = row[header];
        return value !== undefined && value !== null ? String(value) : '';
      }));

      // Check if Roll No column exists
      const hasRollNo = activeClass.students.some(s => s.rollNo && s.rollNo.trim() !== '');

      // Calculate column widths dynamically
      const numColumns = headers.length;
      const fixedColumns = [
        { name: 'Sr No', minWidth: 7, maxWidth: 10 },
        { name: 'Student Name', minWidth: 25, maxWidth: 50 },
      ];

      if (hasRollNo) {
        fixedColumns.push({ name: 'Roll No', minWidth: 12, maxWidth: 15 });
      }

      // Custom columns
      const customColCount = activeClass.customColumns.length;
      const customColMinWidth = 12;
      const customColMaxWidth = 20;

      // Day columns
      const dayColMinWidth = 4;
      const dayColMaxWidth = 6;

      // End columns (Attendance %, Status, Totals)
      const endColumns = [
        { name: 'Attendance %', minWidth: 12, maxWidth: 14 },
        { name: 'Status', minWidth: 12, maxWidth: 14 },
        { name: 'Total Present', minWidth: 10, maxWidth: 12 },
        { name: 'Total Absent', minWidth: 10, maxWidth: 12 },
        { name: 'Total Late', minWidth: 10, maxWidth: 12 },
      ];

      // Calculate minimum required width
      let minRequiredWidth = 0;
      fixedColumns.forEach(col => minRequiredWidth += col.minWidth);
      minRequiredWidth += customColCount * customColMinWidth;
      minRequiredWidth += classDaysCount * dayColMinWidth;
      endColumns.forEach(col => minRequiredWidth += col.minWidth);

      // Determine if we need to scale down
      let columnStyles: any = {};
      let scaleFactor = 1;

      if (minRequiredWidth > availableWidth) {
        scaleFactor = availableWidth / minRequiredWidth;
      }

      // Assign column widths
      let currentIndex = 0;

      // Fixed columns (Sr No, Name, Roll No)
      fixedColumns.forEach(fixedCol => {
        const colWidth = fixedCol.minWidth * scaleFactor;
        columnStyles[currentIndex] = {
          cellWidth: colWidth,
          halign: fixedCol.name === 'Student Name' ? 'left' : 'center',
          fontSize: pdfOrientation === 'portrait' ? 6 : 7
        };
        currentIndex++;
      });

      // Custom columns
      for (let i = 0; i < customColCount; i++) {
        const colWidth = customColMinWidth * scaleFactor;
        columnStyles[currentIndex] = {
          cellWidth: colWidth,
          halign: 'left',
          fontSize: pdfOrientation === 'portrait' ? 5.5 : 6.5
        };
        currentIndex++;
      }

      // Day columns
      for (let i = 0; i < classDaysCount; i++) {
        const colWidth = dayColMinWidth * scaleFactor;
        columnStyles[currentIndex] = {
          cellWidth: colWidth,
          halign: 'center',
          fontSize: pdfOrientation === 'portrait' ? 5 : 6
        };
        currentIndex++;
      }

      // End columns
      endColumns.forEach(endCol => {
        const colWidth = endCol.minWidth * scaleFactor;
        columnStyles[currentIndex] = {
          cellWidth: colWidth,
          halign: 'center',
          fontSize: pdfOrientation === 'portrait' ? 5.5 : 6.5
        };
        currentIndex++;
      });

      // Calculate row height to fit all students on pages
      const startY = 24;
      const footerSpace = 10;
      const availableTableHeight = pageHeight - startY - footerSpace;
      const headerRowHeight = 6;

      // Estimate rows per page
      const numStudents = rows.length;
      const estimatedRowHeight = Math.max(3.5, Math.min(8, (availableTableHeight - headerRowHeight) / numStudents));

      autoTable(pdf, {
        head: [headers],
        body: tableData,
        startY: startY,
        theme: 'grid',
        styles: {
          fontSize: pdfOrientation === 'portrait' ? 5.5 : 6.5,
          cellPadding: { top: 0.8, right: 0.5, bottom: 0.8, left: 0.5 },
          overflow: 'linebreak',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          minCellHeight: estimatedRowHeight
        },
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: pdfOrientation === 'portrait' ? 6 : 7,
          halign: 'center',
          lineColor: [16, 185, 129],
          lineWidth: 0.15,
          minCellHeight: headerRowHeight,
          cellPadding: { top: 1, right: 0.5, bottom: 1, left: 0.5 }
        },
        bodyStyles: {
          minCellHeight: estimatedRowHeight,
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: margin, right: margin, top: startY, bottom: footerSpace },
        tableWidth: 'auto',
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: 0,
        didParseCell: function (data: any) {
          // Apply colors to attendance cells
          if (data.section === 'body') {
            const header = headers[data.column.index];

            // Color attendance status cells
            if (!isNaN(Number(header))) {
              const cellValue = data.cell.raw;
              if (cellValue === 'P') {
                data.cell.styles.fillColor = [209, 250, 229];
                data.cell.styles.textColor = [6, 95, 70];
                data.cell.styles.fontStyle = 'bold';
              } else if (cellValue === 'A') {
                data.cell.styles.fillColor = [254, 226, 226];
                data.cell.styles.textColor = [153, 27, 27];
                data.cell.styles.fontStyle = 'bold';
              } else if (cellValue === 'L') {
                data.cell.styles.fillColor = [254, 243, 199];
                data.cell.styles.textColor = [146, 64, 14];
                data.cell.styles.fontStyle = 'bold';
              }
            }
            // Color status cells
            else if (header === 'Status') {
              const cellValue = data.cell.raw;
              if (cellValue === 'Excellent') {
                data.cell.styles.textColor = [6, 95, 70];
                data.cell.styles.fontStyle = 'bold';
              } else if (cellValue === 'Good') {
                data.cell.styles.textColor = [30, 64, 175];
                data.cell.styles.fontStyle = 'bold';
              } else if (cellValue === 'Moderate') {
                data.cell.styles.textColor = [146, 64, 14];
                data.cell.styles.fontStyle = 'bold';
              } else if (cellValue === 'At Risk') {
                data.cell.styles.textColor = [153, 27, 27];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        didDrawPage: function (data: any) {
          // Header on continuation pages
          if (data.pageNumber > 1) {
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${activeClass.name} - Continued`, pageWidth / 2, 10, { align: 'center' });
          }
        }
      });

      // Add page numbers
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(100);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      pdf.save(`${activeClass.name}_${monthName.replace(' ', '_')}_Attendance.pdf`);

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setShowExportMenu(false);
        setShowPdfPreview(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportWithOptions = () => {
    if (pendingExportType === 'csv') {
      exportToCSV();
    } else if (pendingExportType === 'excel') {
      exportToExcel();
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-md border border-emerald-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {isEditingClassName ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editedClassName}
                    onChange={(e) => setEditedClassName(e.target.value)}
                    className="text-3xl font-bold text-emerald-900 bg-white border-2 border-emerald-500 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleClassNameSave();
                      if (e.key === 'Escape') handleClassNameCancel();
                    }}
                  />
                  <button
                    onClick={handleClassNameSave}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                    title="Save"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleClassNameCancel}
                    className="p-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-emerald-900">{activeClass.name}</h2>
                  <button
                    onClick={() => setIsEditingClassName(true)}
                    className="p-2 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer group"
                    title="Edit class name"
                  >
                    <Edit2 className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {activeClass.students.length} Students
                </span>
                <span className="text-slate-400">•</span>
                <span>Class ID: {activeClass.id}</span>
                <span className="text-slate-400">•</span>
                <span>{monthName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={activeClass.students.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExportMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-emerald-200 z-20 overflow-hidden">
                      {exportSuccess ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-emerald-600" />
                          </div>
                          <h3 className="text-lg font-bold text-emerald-900 mb-2">Export Successful!</h3>
                          <p className="text-sm text-slate-600">Your file has been downloaded</p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
                            <h3 className="text-lg font-bold text-white">Export Attendance</h3>
                            <p className="text-teal-50 text-sm mt-1">Choose your format</p>
                          </div>

                          <div className="p-4">
                            <button
                              onClick={() => {
                                setPendingExportType('csv');
                                setShowExportMenu(false);
                                setShowExportOptions(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer text-left mb-2"
                            >
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">CSV Format</p>
                                <p className="text-xs text-slate-600">Compatible with Excel, Google Sheets</p>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setPendingExportType('excel');
                                setShowExportMenu(false);
                                setShowExportOptions(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 rounded-xl transition-colors cursor-pointer text-left mb-2"
                            >
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">Excel Format</p>
                                <p className="text-xs text-slate-600">Native .xlsx file with formatting</p>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setShowExportMenu(false);
                                setShowPdfPreview(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl transition-colors cursor-pointer text-left"
                            >
                              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <File className="w-5 h-5 text-red-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">PDF Format</p>
                                <p className="text-xs text-slate-600">Configure & preview layout</p>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={onOpenQRAttendance}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-xl hover:shadow-lg transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                QR Attendance
              </button>

              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-emerald-300 text-emerald-700 font-medium rounded-xl hover:bg-emerald-50 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                Sheet Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-md border border-emerald-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ minWidth: '80px' }}>Sr No.</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ minWidth: '250px' }}>Student Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ minWidth: '120px' }}>Roll No</th>

                {activeClass.customColumns.map((column) => (
                  <th key={column.id} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider group relative" style={{ minWidth: '150px' }}>
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      <button
                        onClick={() => onDeleteColumn(column.id)}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-rose-100 rounded transition-all cursor-pointer"
                      >
                        <X className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  </th>
                ))}

                <th className="px-4 py-4 text-center">
                  <button
                    onClick={onAddColumn}
                    className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors group cursor-pointer"
                    title="Add custom column"
                  >
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                  </button>
                </th>

                {Array.from({ length: daysInMonth }, (_, idx) => (
                  <th key={idx} className="px-3 py-4 text-center text-xs font-medium text-slate-600 w-12">
                    {idx + 1}
                  </th>
                ))}

                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-24">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-28">Performance</th>
                <th className="px-4 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100">
              {activeClass.students.map((student, index) => {
                const attendance = calculateAttendance(student);
                const risk = getRiskLevel(attendance);

                return (
                  <tr key={student.id} className="hover:bg-emerald-50/50 transition-colors group">
                    <td className="px-6 py-4" style={{ minWidth: '80px' }}>
                      <span className="text-sm font-medium text-slate-600">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4" style={{ minWidth: '250px' }}>
                      <input
                        type="text"
                        value={student.name}
                        onChange={(e) => onUpdateStudent(student.id, 'name', e.target.value)}
                        className="w-full text-sm font-medium text-black bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-lg px-2 py-1 border border-transparent focus:border-emerald-500 transition-all cursor-text"
                        placeholder="Student Name"
                      />
                    </td>
                    <td className="px-6 py-4" style={{ minWidth: '120px' }}>
                      <input
                        type="text"
                        value={student.rollNo}
                        onChange={(e) => onUpdateStudent(student.id, 'rollNo', e.target.value)}
                        className="w-full text-sm font-medium text-black bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-lg px-2 py-1 border border-transparent focus:border-emerald-500 transition-all cursor-text"
                        placeholder="Optional"
                      />
                    </td>

                    {activeClass.customColumns.map((column) => (
                      <td key={column.id} className="px-6 py-4" style={{ minWidth: '150px' }}>
                        {column.type === 'select' ? (
                          <select
                            value={student[column.id] || ''}
                            onChange={(e) => onUpdateStudent(student.id, column.id, e.target.value)}
                            className="w-full text-sm text-black bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-lg px-2 py-1 border border-transparent focus:border-emerald-500 transition-all cursor-pointer"
                          >
                            <option value="">Select...</option>
                            {column.options?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={column.type}
                            value={student[column.id] || ''}
                            onChange={(e) => onUpdateStudent(student.id, column.id, e.target.value)}
                            className="w-full text-sm text-black bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-lg px-2 py-1 border border-transparent focus:border-emerald-500 transition-all cursor-text"
                            placeholder={`Enter ${column.label.toLowerCase()}`}
                          />
                        )}
                      </td>
                    ))}

                    <td className="px-4 py-4"></td>

                    {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                      const day = dayIdx + 1;
                      const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
                      const status = student.attendance[dateKey];

                      return (
                        <td key={dayIdx} className="px-3 py-2 text-center">
                          <button
                            onClick={() => onToggleAttendance(student.id, day)}
                            className={`w-9 h-9 text-xs font-bold rounded-lg transition-all cursor-pointer ${status === 'P' ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm' :
                              status === 'A' ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm' :
                                status === 'L' ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' :
                                  'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                          >
                            {status || '·'}
                          </button>
                        </td>
                      );
                    })}

                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${risk.color} ${risk.bg}`}>
                        {attendance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${risk.dot} shadow-sm`}></div>
                        <span className={`text-xs font-medium ${risk.color}`}>{risk.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => onDeleteStudent(student.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-t border-emerald-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Total: <span className="font-semibold text-slate-900">{activeClass.students.length}</span> students
            </span>
          </div>
          <button
            onClick={onAddStudent}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium rounded-xl hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* CSV/Excel Export Options Modal */}
      {showExportOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className={`px-6 py-5 flex items-center justify-between ${pendingExportType === 'csv' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'
              }`}>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {pendingExportType === 'csv' ? 'CSV' : 'Excel'} Export Options
                </h3>
                <p className="text-white/90 text-sm mt-1">Configure your export settings</p>
              </div>
              <button
                onClick={() => {
                  setShowExportOptions(false);
                  setPendingExportType(null);
                  setExportOnlyClassDays(true);
                }}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${pendingExportType === 'csv' ? 'hover:bg-emerald-700' : 'hover:bg-green-700'
                  }`}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Days to Export</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setExportOnlyClassDays(true)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${exportOnlyClassDays
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left flex-1">
                        <p className="font-semibold text-slate-900">Only Class Days</p>
                        <p className="text-xs text-slate-600">Export only days with attendance marked</p>
                      </div>
                      {exportOnlyClassDays && (
                        <Check className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setExportOnlyClassDays(false)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${!exportOnlyClassDays
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left flex-1">
                        <p className="font-semibold text-slate-900">All Days</p>
                        <p className="text-xs text-slate-600">Export all {daysInMonth} days of the month</p>
                      </div>
                      {!exportOnlyClassDays && (
                        <Check className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-blue-900 text-sm mb-2">Export Information</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><strong>Format:</strong> {pendingExportType === 'csv' ? '.csv (Comma Separated Values)' : '.xlsx (Microsoft Excel)'}</p>
                  <p><strong>Days:</strong> {exportOnlyClassDays ? `Only days with attendance marked` : `All ${daysInMonth} days`}</p>
                  <p><strong>Column Order:</strong> Sr No → Name → Roll No → Custom Columns → Days → Attendance % → Status → Totals</p>
                  <p><strong>Includes:</strong> Present, Absent, Late counts and attendance percentage</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowExportOptions(false);
                  setPendingExportType(null);
                  setExportOnlyClassDays(true);
                }}
                className="px-5 py-2.5 bg-white border-2 border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExportWithOptions}
                disabled={exporting}
                className={`px-6 py-2.5 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 ${pendingExportType === 'csv' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'
                  }`}
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export {pendingExportType === 'csv' ? 'CSV' : 'Excel'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">PDF Export Preview</h3>
                <p className="text-red-50 text-sm mt-1">Configure orientation and preview layout</p>
              </div>
              <button
                onClick={() => {
                  setShowPdfPreview(false);
                  setPdfOrientation('landscape');
                  setExportOnlyClassDays(true);
                }}
                className="p-2 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Page Orientation</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPdfOrientation('landscape')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${pdfOrientation === 'landscape'
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-red-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-16 h-12 rounded border-2 ${pdfOrientation === 'landscape' ? 'border-red-500 bg-red-100' : 'border-slate-300'
                        }`}></div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Landscape</p>
                        <p className="text-xs text-slate-600">Best for many columns (297mm × 210mm)</p>
                      </div>
                      {pdfOrientation === 'landscape' && (
                        <Check className="w-5 h-5 text-red-600 ml-auto" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setPdfOrientation('portrait')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${pdfOrientation === 'portrait'
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-red-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-16 rounded border-2 ${pdfOrientation === 'portrait' ? 'border-red-500 bg-red-100' : 'border-slate-300'
                        }`}></div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Portrait</p>
                        <p className="text-xs text-slate-600">Best for fewer columns (210mm × 297mm)</p>
                      </div>
                      {pdfOrientation === 'portrait' && (
                        <Check className="w-5 h-5 text-red-600 ml-auto" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Days to Export</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setExportOnlyClassDays(true)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${exportOnlyClassDays
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left flex-1">
                        <p className="font-semibold text-slate-900">Only Class Days</p>
                        <p className="text-xs text-slate-600">Export only days with attendance marked</p>
                      </div>
                      {exportOnlyClassDays && (
                        <Check className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setExportOnlyClassDays(false)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${!exportOnlyClassDays
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left flex-1">
                        <p className="font-semibold text-slate-900">All Days</p>
                        <p className="text-xs text-slate-600">Export all {daysInMonth} days of the month</p>
                      </div>
                      {!exportOnlyClassDays && (
                        <Check className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Layout Preview</label>
                <div className="bg-slate-100 rounded-xl p-8 flex items-center justify-center">
                  <div
                    className={`bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-300 ${pdfOrientation === 'landscape' ? 'w-full max-w-4xl' : 'w-full max-w-xl'
                      }`}
                    style={{
                      aspectRatio: pdfOrientation === 'landscape' ? '1.414' : '0.707'
                    }}
                  >
                    <div className="p-4 h-full flex flex-col text-xs">
                      <div className="text-center mb-3 pb-3 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 text-sm">{activeClass.name}</h4>
                        <p className="text-xs text-slate-600">Attendance Sheet - {monthName}</p>
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                          <span>Class ID: {activeClass.id}</span>
                          <span>Students: {activeClass.students.length}</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <div className="text-xs border border-slate-300 rounded overflow-hidden">
                          <div className={`bg-emerald-600 text-white font-semibold grid gap-px ${pdfOrientation === 'landscape' ? 'grid-cols-12' : 'grid-cols-8'
                            }`}>
                            <div className="px-1 py-1 text-center">No</div>
                            <div className="px-1 py-1 col-span-2">Name</div>
                            <div className="px-1 py-1 text-center">Roll</div>
                            {activeClass.customColumns.slice(0, 1).map((col) => (
                              <div key={col.id} className="px-1 py-1 truncate">{col.label.slice(0, 8)}</div>
                            ))}
                            {pdfOrientation === 'landscape' ? (
                              <>
                                <div className="px-1 py-1 text-center">1</div>
                                <div className="px-1 py-1 text-center">2</div>
                                <div className="px-1 py-1 text-center">3</div>
                                <div className="px-1 py-1 text-center">...</div>
                                <div className="px-1 py-1 text-center">{daysInMonth}</div>
                              </>
                            ) : (
                              <>
                                <div className="px-1 py-1 text-center">1</div>
                                <div className="px-1 py-1 text-center">...</div>
                              </>
                            )}
                            <div className="px-1 py-1 text-center">%</div>
                            <div className="px-1 py-1 text-center">Status</div>
                          </div>

                          {[1, 2, 3].map((i) => (
                            <div key={i} className={`bg-white grid gap-px border-t border-slate-200 ${pdfOrientation === 'landscape' ? 'grid-cols-12' : 'grid-cols-8'
                              }`}>
                              <div className="px-1 py-1 text-center text-slate-600">{i}</div>
                              <div className="px-1 py-1 col-span-2 text-slate-800 truncate">Student {i}</div>
                              <div className="px-1 py-1 text-center text-slate-600">{i}01</div>
                              {activeClass.customColumns.slice(0, 1).map((col) => (
                                <div key={col.id} className="px-1 py-1 text-slate-600 text-center">-</div>
                              ))}
                              {pdfOrientation === 'landscape' ? (
                                <>
                                  <div className="px-1 py-1 text-center bg-emerald-100 text-emerald-700 font-bold">P</div>
                                  <div className="px-1 py-1 text-center bg-rose-100 text-rose-700 font-bold">A</div>
                                  <div className="px-1 py-1 text-center bg-amber-100 text-amber-700 font-bold">L</div>
                                  <div className="px-1 py-1 text-center text-slate-400">...</div>
                                  <div className="px-1 py-1 text-center bg-emerald-100 text-emerald-700 font-bold">P</div>
                                </>
                              ) : (
                                <>
                                  <div className="px-1 py-1 text-center bg-emerald-100 text-emerald-700 font-bold">P</div>
                                  <div className="px-1 py-1 text-center text-slate-400">...</div>
                                </>
                              )}
                              <div className="px-1 py-1 text-center text-emerald-700 font-semibold">
                                {i === 1 ? '95' : i === 2 ? '78' : '88'}
                              </div>
                              <div className="px-1 py-1 text-center text-xs">
                                {i === 1 ? 'Exc' : i === 2 ? 'Mod' : 'Good'}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-center text-xs text-slate-400 mt-2">
                          Preview shows sample data - actual PDF will contain all {activeClass.students.length} students
                        </div>
                      </div>

                      <div className="text-center text-xs text-slate-400 mt-3 pt-2 border-t border-slate-200">
                        Page 1 of 1
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 text-sm mb-2">Export Information</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><strong>Orientation:</strong> {pdfOrientation === 'landscape' ? 'Landscape (297×210mm, 7pt font)' : 'Portrait (210×297mm, 6pt font)'}</p>
                  <p><strong>Days:</strong> {exportOnlyClassDays ? `Only days with attendance marked` : `All ${daysInMonth} days`}</p>
                  <p><strong>Features:</strong> Grid lines, centered layout, optimized spacing</p>
                  <p><strong>Included:</strong> Sr No → Name → Roll → {activeClass.customColumns.length} Custom Columns → Days → Attendance % → Status → Totals</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowPdfPreview(false);
                  setPdfOrientation('landscape');
                }}
                className="px-5 py-2.5 bg-white border-2 border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={exportToPDF}
                disabled={exporting}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export PDF ({pdfOrientation === 'landscape' ? 'Landscape' : 'Portrait'})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};