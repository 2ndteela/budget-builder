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

// OFX 1.x is SGML, not XML: leaf tags like <TRNAMT>-99.42 are never closed, so DOMParser
// rejects it. Read each tag's value up to the next tag or line break, which also covers OFX 2.x XML.
const getOfxTag = (block, tagName) =>
  block.match(new RegExp(`<${tagName}>([^<\\r\\n]*)`, 'i'))?.[1].trim() || ''

const parseOfxTransactions = (statement) => {
  const transactions = []
  const stmtTrnBlocks = statement.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || []

  for (const trn of stmtTrnBlocks) {
    const dateStr = getOfxTag(trn, 'DTPOSTED')
    const amount = parseFloat(getOfxTag(trn, 'TRNAMT')) || 0
    const name = getOfxTag(trn, 'NAME') || getOfxTag(trn, 'MEMO')
    const fitid = getOfxTag(trn, 'FITID')

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

// One export can hold several accounts, each in its own bank (STMTRS) or credit card (CCSTMTRS) statement
const parseOfx = (text) => {
  const statementBlocks = text.match(/<(CC)?STMTRS>[\s\S]*?<\/(CC)?STMTRS>/gi) || []

  return statementBlocks
    .map((statement) => ({
      bankAccountNumber: getOfxTag(statement, 'ACCTID'),
      accountType: getOfxTag(statement, 'ACCTTYPE') || 'CREDIT CARD',
      transactions: parseOfxTransactions(statement)
    }))
    .filter((statement) => statement.transactions.length > 0)
}

const findBudget = (monthlyBudgets, date) => monthlyBudgets.find((item) =>
  item.month === date.getMonth() + 1 && item.year === date.getFullYear())

const columnLabel = (field) => field.charAt(0).toUpperCase() + field.slice(1)

export default function FileUpload({ onImport }) {
  const {
    accounts: { accounts, updateAccount },
    monthlyBudgets: { monthlyBudgets }
  } = useAppData()
  const [showCsvMappingDialog, setShowCsvMappingDialog] = useState(false)
  const [csvData, setCsvData] = useState(emptyCsvData)
  const [columnMapping, setColumnMapping] = useState(emptyColumnMapping)
  const [csvAccountId, setCsvAccountId] = useState(accounts[0]?.id || 1)
  const [ofxStatements, setOfxStatements] = useState([])
  // Bank account number -> app account id, or '' to skip that statement
  const [statementAccounts, setStatementAccounts] = useState({})
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

      const budget = findBudget(monthlyBudgets, date)
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

  const { ofxImportable, ofxUnplaced } = useMemo(() => {
    const rows = ofxStatements.flatMap(({ bankAccountNumber, transactions }) => {
      const accountId = statementAccounts[bankAccountNumber]
      if (!accountId) return []

      return transactions.map((trn) => {
        const budget = findBudget(monthlyBudgets, trn.date)
        if (!budget) return null

        return {
          bankTransactionId: trn.bankTransactionId,
          title: trn.title,
          amount: trn.amount,
          date: trn.date.getDate(),
          monthlyBudgetId: budget.id,
          projectedExpenseId: null,
          accountId
        }
      })
    })

    return {
      ofxImportable: rows.filter(Boolean),
      ofxUnplaced: rows.filter((row) => !row).length
    }
  }, [ofxStatements, statementAccounts, monthlyBudgets])

  const closeDialog = () => {
    setShowCsvMappingDialog(false)
    setCsvData(emptyCsvData)
    setColumnMapping(emptyColumnMapping)
    setCsvAccountId(accounts[0]?.id || 1)
  }

  const closeOfxDialog = () => {
    setOfxStatements([])
    setStatementAccounts({})
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase()

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
          const statements = parseOfx(target.result)
          if (statements.length === 0) {
            alert('No transactions found in file.')
            return
          }

          // Statements whose bank account number is already linked to an account come pre-selected
          setStatementAccounts(Object.fromEntries(statements.map(({ bankAccountNumber }) => [
            bankAccountNumber,
            accounts.find((account) => account.bankAccountNumber === bankAccountNumber)?.id || ''
          ])))
          setOfxStatements(statements)
        }
      }
      reader.readAsText(file)
    }
    event.target.value = ''
  }

  const handleImportOfx = async () => {
    // Remember each pick so the next export from the same bank account maps itself
    const links = Object.entries(statementAccounts).filter(([, accountId]) => accountId)
    for (const [bankAccountNumber, accountId] of links) {
      const account = accounts.find(({ id }) => id === accountId)
      if (account && account.bankAccountNumber !== bankAccountNumber) {
        await updateAccount({ ...account, bankAccountNumber })
      }
    }

    onImport(ofxImportable)
    closeOfxDialog()
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

      {ofxStatements.length > 0 && (
        <div className='csv-mapping-overlay'>
          <div className='csv-mapping-dialog'>
            <h2>Assign Bank Accounts</h2>

            <div className='mapping-section'>
              <h3>Statements in File</h3>
              <div className='mapping-grid'>
                {ofxStatements.map(({ bankAccountNumber, accountType, transactions }) => (
                  <div key={bankAccountNumber} className='mapping-row'>
                    <label>
                      {accountType} ••{bankAccountNumber.slice(-4)}
                      <br />
                      <span className='mapping-detail'>
                        {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
                      </span>
                    </label>
                    <select
                      value={statementAccounts[bankAccountNumber]}
                      onChange={({ target }) => setStatementAccounts({
                        ...statementAccounts,
                        [bankAccountNumber]: target.value ? Number(target.value) : ''
                      })}
                    >
                      <option value=''>Skip</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {ofxUnplaced > 0 && (
              <p className='mapping-warning'>
                {ofxUnplaced} transaction{ofxUnplaced === 1 ? '' : 's'} fall outside every existing monthly budget and
                will be skipped. Create those months in Planning and Management to import them.
              </p>
            )}

            <div className='csv-mapping-buttons'>
              <button onClick={handleImportOfx} disabled={ofxImportable.length === 0}>
                Import {ofxImportable.length > 0 ? `${ofxImportable.length} ` : ''}Transactions
              </button>
              <button onClick={closeOfxDialog}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
