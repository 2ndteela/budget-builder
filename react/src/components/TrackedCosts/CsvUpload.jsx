import { useState, useRef } from 'react';
import { MdUploadFile } from 'react-icons/md';
import useCategories from '../../hooks/useCategories';

export default function CsvUpload({ accounts, onImport }) {
  const { categories } = useCategories()
  const [showCsvMappingDialog, setShowCsvMappingDialog] = useState(false);
  const [csvData, setCsvData] = useState({ headers: [], rows: [], firstRow: [] });
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    title: '',
    amount: '',
    category: '',
    bankTransactionId: ''
  });
  const [categoryMapping, setCategoryMapping] = useState({});
  const [csvAccountId, setCsvAccountId] = useState(1);
  const fileInputRef = useRef(null);

  const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
        } else {
          current += char;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.trim().split('\n');
        const headers = parseCsvLine(lines[0]);
        const rows = lines.slice(1).map(line => parseCsvLine(line));
        const firstRow = rows[0] || [];

        setCsvData({ headers, rows, firstRow });
        setColumnMapping({ date: '', title: '', amount: '', category: '', bankTransactionId: '' });
        setCategoryMapping({});
        setShowCsvMappingDialog(true);
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleImportCsv = () => {
    const { rows } = csvData;
    const dateIdx = csvData.headers.indexOf(columnMapping.date);
    const titleIdx = csvData.headers.indexOf(columnMapping.title);
    const amountIdx = csvData.headers.indexOf(columnMapping.amount);
    const categoryIdx = csvData.headers.indexOf(columnMapping.category);
    const bankTransactionIdIdx = csvData.headers.indexOf(columnMapping.bankTransactionId);
    const selectedAccount = accounts.find(acc => acc.id === csvAccountId);

    const newTransactions = rows.map((row) => {
      const csvCategory = row[categoryIdx];
      const mappedCategoryId = categoryMapping[csvCategory];
      const categoryId = mappedCategoryId || 1;
      const mappedBankTransactionId = bankTransactionIdIdx >= 0 ? row[bankTransactionIdIdx] : null;

      return {
        date: new Date(row[dateIdx]).getTime(),
        title: row[titleIdx],
        amount: Math.abs(parseFloat(row[amountIdx])),
        categoryId: parseInt(categoryId, 10),
        bankTransactionId: mappedBankTransactionId,
        accountId: selectedAccount.id
      };
    });

    onImport(newTransactions);
    setShowCsvMappingDialog(false);
    setCsvAccountId(1);
  };

  const handleCancelCsvImport = () => {
    setShowCsvMappingDialog(false);
    setCsvData({ headers: [], rows: [], firstRow: [] });
    setColumnMapping({ date: '', title: '', amount: '', category: '', bankTransactionId: '' });
    setCategoryMapping({});
    setCsvAccountId(1);
  };

  const getUniqueCategoryValues = () => {
    if (!columnMapping.category) return [];
    const categoryIdx = csvData.headers.indexOf(columnMapping.category);
    const values = csvData.rows.map(row => row[categoryIdx]);
    return [...new Set(values)];
  };


  return (
    <>
      <button id="upload-csv-button" onClick={() => fileInputRef.current?.click()}>
        <MdUploadFile />
        Upload CSV
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {showCsvMappingDialog && (
        <div className="csv-mapping-overlay">
          <div className="csv-mapping-dialog">
            <h2>Map CSV Columns</h2>

            <div className="mapping-section">
              <h3>Column Mapping</h3>
              <div className="mapping-grid">
                {['date', 'title', 'amount', 'category', 'bankTransactionId'].map(field => (
                  <div key={field} className="mapping-row">
                    <label>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                    <select
                      value={columnMapping[field]}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                    >
                      <option value="">Select column</option>
                      {csvData.headers.map((header, idx) => (
                        <option key={idx} value={header}>
                          {header} (e.g., {csvData.firstRow[idx]})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {columnMapping.category && (
              <div className="mapping-section">
                <h3>Category Mapping</h3>
                <div className="category-mapping-grid">
                  {getUniqueCategoryValues().map(csvCat => (
                    <div key={csvCat} className="mapping-row">
                      <label>{csvCat}:</label>
                      <select
                        value={categoryMapping[csvCat] || ''}
                        onChange={(e) => setCategoryMapping({ ...categoryMapping, [csvCat]: e.target.value })}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mapping-section">
              <h3>Account Assignment</h3>
              <div className="mapping-row">
                <label>Account:</label>
                <select
                  value={csvAccountId}
                  onChange={(e) => setCsvAccountId(Number(e.target.value))}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="csv-mapping-buttons">
              <button onClick={handleImportCsv}>Import</button>
              <button onClick={handleCancelCsvImport}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
