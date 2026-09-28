import { useMemo, useRef, useState } from 'react'
import { MdUploadFile } from 'react-icons/md'
import useAppData from '../../../DataContext/useAppData'
import './csvImport.css'
import CompressedButton from '../../shared/CompressedButton/CompressedButton'

const MAPPED_COLUMNS = ['date', 'title', 'amount', 'bankTransactionId']
const REQUIRED_COLUMNS = ['date', 'title', 'amount']
const emptyColumnMapping = { date: '', title: '', amount: '', bankTransactionId: '' }
const emptyCsvData = { headers: [], rows: [], firstRow: [] }

const parseCsvLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false
  let quoteChar = null

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = null
      } else {
        current += char
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

const parseOfx = (text) => {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'text/xml')

  const transactions = []
  const stmtTrnElements = xmlDoc.getElementsByTagName('STMTTRN')

  for (let i = 0; i < stmtTrnElements.length; i++) {
    const trn = stmtTrnElements[i]
    const getTag = (tagName) => trn.getElementsByTagName(tagName)[0]?.textContent || ''

    const dateStr = getTag('DTPOSTED')
    const amount = parseFloat(getTag('TRNAMT')) || 0
    const name = getTag('NAME') || getTag('MEMO') || ''
    const fitid = getTag('FITID')

    // OFX date format: YYYYMMDD or YYYYMMDDHHMMSS
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6))
    const day = parseInt(dateStr.substring(6, 8))

    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && name) {
      transactions.push({
        date: new Date(year, month - 1, day),
        title: name,
        amount: Math.abs(amount),
        bankTransactionId: fitid
      })
    }
  }

  return transactions
}

const columnLabel = (field) => field.charAt(0).toUpperCase() + field.slice(1)

export default function FileUpload({ onImport }) {
  const {
    accounts: { accounts },
    monthlyBudgets: { monthlyBudgets }
  } = useAppData()
  const [showCsvMappingDialog, setShowCsvMappingDialog] = useState(false)
  const [csvData, setCsvData] = useState(emptyCsvData)
  const [columnMapping, setColumnMapping] = useState(emptyColumnMapping)
  const [csvAccountId, setCsvAccountId] = useState(accounts[0]?.id || 1)
  const [fileType, setFileType] = useState('')
  const fileInputRef = useRef(null)

  // A transaction stores only the day of the month, so each row needs the monthly budget
  // that its date falls in. Rows outside every existing budget cannot be placed in time.
  const { importable, unplaced } = useMemo(() => {
    const dateIndex = csvData.headers.indexOf(columnMapping.date)
    const titleIndex = csvData.headers.indexOf(columnMapping.title)
    const amountIndex = csvData.headers.indexOf(columnMapping.amount)
    const bankTransactionIdIndex = csvData.headers.indexOf(columnMapping.bankTransactionId)
    if (dateIndex < 0 || titleIndex < 0 || amountIndex < 0) return { importable: [], unplaced: 0 }

    const rows = csvData.rows.map((row) => {
      const date = new Date(row[dateIndex])
      if (isNaN(date.getTime())) return null

      const budget = monthlyBudgets.find((item) =>
        item.month === date.getMonth() + 1 && item.year === date.getFullYear())
      if (!budget) return null

      return {
        bankTransactionId: bankTransactionIdIndex >= 0 ? row[bankTransactionIdIndex] : null,
        title: row[titleIndex],
        amount: Math.abs(parseFloat(row[amountIndex])),
        date: date.getDate(),
        monthlyBudgetId: budget.id,
        // Imported rows start unmatched; expenses get attached from the transactions table.
        projectedExpenseId: null,
        accountId: csvAccountId
      }
    })

    return {
      importable: rows.filter(Boolean),
      unplaced: rows.filter((row) => !row).length
    }
  }, [csvAccountId, columnMapping, csvData, monthlyBudgets])

  const closeDialog = () => {
    setShowCsvMappingDialog(false)
    setCsvData(emptyCsvData)
    setColumnMapping(emptyColumnMapping)
    setCsvAccountId(accounts[0]?.id || 1)
    setFileType('')
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase()
      setFileType(extension)

      const reader = new FileReader()
      reader.onload = ({ target }) => {
        if (extension === 'csv') {
          // CSV requires column mapping
          const lines = target.result.trim().split('\n')
          const rows = lines.slice(1).map((line) => parseCsvLine(line))

          setCsvData({ headers: parseCsvLine(lines[0]), rows, firstRow: rows[0] || [] })
          setColumnMapping(emptyColumnMapping)
          setShowCsvMappingDialog(true)
        } else if (['ofx', 'qfx', 'qbo'].includes(extension)) {
          // OFX/QFX/QBO can be parsed directly
          const ofxTransactions = parseOfx(target.result)

          // Convert to importable format with budget assignment
          const importable = ofxTransactions.map(trn => {
            const budget = monthlyBudgets.find((item) =>
              item.month === trn.date.getMonth() + 1 && item.year === trn.date.getFullYear())

            if (!budget) return null

            return {
              bankTransactionId: trn.bankTransactionId,
              title: trn.title,
              amount: trn.amount,
              date: trn.date.getDate(),
              monthlyBudgetId: budget.id,
              projectedExpenseId: null,
              accountId: accounts[0]?.id || 1
            }
          }).filter(Boolean)

          if (importable.length > 0) {
            onImport(importable)
          } else {
            alert('No valid transactions found in file or all transactions fall outside existing budgets.')
          }
        }
      }
      reader.readAsText(file)
    }
    event.target.value = ''
  }

  const handleImportCsv = () => {
    onImport(importable)
    closeDialog()
  }

  return (
    <>
      <CompressedButton id='upload-file-button' color="green" onClick={() => fileInputRef.current?.click()} Icon={MdUploadFile}>
        File Upload
      </CompressedButton>
      <input
        ref={fileInputRef}
        type='file'
        accept='.csv,.ofx,.qfx,.qbo'
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {showCsvMappingDialog && (
        <div className='csv-mapping-overlay'>
          <div className='csv-mapping-dialog'>
            <h2>Map CSV Columns</h2>

            <div className='mapping-section'>
              <h3>Column Mapping</h3>
              <div className='mapping-grid'>
                {MAPPED_COLUMNS.map((field) => (
                  <div key={field} className='mapping-row'>
                    <label>{columnLabel(field)}{REQUIRED_COLUMNS.includes(field) ? '*' : ''}:</label>
                    <select
                      value={columnMapping[field]}
                      onChange={({ target }) => setColumnMapping({ ...columnMapping, [field]: target.value })}
                    >
                      <option value=''>Select column</option>
                      {csvData.headers.map((header, index) => (
                        <option key={index} value={header}>
                          {header} (e.g., {csvData.firstRow[index]})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className='mapping-section'>
              <h3>Account Assignment</h3>
              <div className='mapping-row'>
                <label>Account:</label>
                <select value={csvAccountId} onChange={({ target }) => setCsvAccountId(Number(target.value))}>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {unplaced > 0 && (
              <p className='mapping-warning'>
                {unplaced} row{unplaced === 1 ? '' : 's'} fall outside every existing monthly budget and will be
                skipped. Create those months in Planning and Management to import them.
              </p>
            )}

            <div className='csv-mapping-buttons'>
              <button onClick={handleImportCsv} disabled={importable.length === 0}>
                Import {importable.length > 0 ? `${importable.length} ` : ''}Transactions
              </button>
              <button onClick={closeDialog}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
