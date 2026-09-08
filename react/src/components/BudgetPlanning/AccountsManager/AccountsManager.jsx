import { useState } from 'react'
import { MdEdit, MdSave, MdDelete, MdClose } from 'react-icons/md'
import './accountsManager.css'
import useAppData from '../../../DataContext/useAppData'
import EditableField from '../../shared/EditableField/EditableField'

export default function AccountsManager() {
  const [editingAccountId, setEditingAccountId] = useState(null)
  const [editedAccount, setEditedAccount] = useState({})
  const [newAccountName, setNewAccountName] = useState('')

  const { accounts: { accounts, addAccount, updateAccount, deleteAccount } } = useAppData()

  const handleEdit = (account) => {
    setEditingAccountId(account.id)
    setEditedAccount({ ...account })
  }

  const handleSave = async (accountId) => {
    if (editedAccount.name?.trim() === '') return

    try {
      await updateAccount({
        id: accountId,
        name: editedAccount.name
      })
      setEditingAccountId(null)
      setEditedAccount({})
    } catch (err) {
      alert('Error saving account')
      console.error(err)
    }
  }

  const handleCancel = () => {
    setEditingAccountId(null)
    setEditedAccount({})
  }

  const handleDelete = async (accountId) => {
    try {
      await deleteAccount(accountId)
    } catch (err) {
      alert('Error deleting account')
      console.error(err)
    }
  }

  const handleCreate = async () => {
    if (newAccountName.trim() === '') return

    try {
      await addAccount({ name: newAccountName })
      setNewAccountName('')
    } catch (err) {
      alert('Error creating account')
      console.error(err)
    }
  }

  return (
    <div className="accounts-manager">
      <h3>Manage Accounts</h3>
      <div className="accounts-list">
        {accounts?.map((account) => {
          const isEditing = editingAccountId === account.id
          return (
            <div key={account.id} className="account-item">
              <EditableField
                value={isEditing ? editedAccount.name : account.name}
                setValue={(name) => setEditedAccount({ ...editedAccount, name })}
                editMode={isEditing}
              />
              <div className="account-actions">
                <button
                  onClick={() => isEditing ? handleSave(account.id) : handleEdit(account)}
                  className="account-action-btn"
                >
                  {isEditing ? <MdSave /> : <MdEdit />}
                </button>
                <button
                  onClick={() => isEditing ? handleCancel() : handleDelete(account.id)}
                  className={`account-action-btn ${isEditing ? '' : 'delete'}`}
                >
                  {isEditing ? <MdClose /> : <MdDelete />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="new-account-section">
        <input
          type="text"
          placeholder="New account name"
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="account-name-input"
        />
        <button onClick={handleCreate} className="create-account-btn">
          Add Account
        </button>
      </div>
    </div>
  )
}
