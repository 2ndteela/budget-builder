import { useState } from 'react';
import { MdEdit, MdSave, MdDelete, MdClose } from 'react-icons/md';

export default function AccountsManager({ accounts, onAdd, onUpdate, onDelete }) {
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  const handleEdit = (account) => {
    setEditingAccountId(account.id);
    setEditedName(account.name);
  };

  const handleSave = async (accountId) => {
    if (editedName.trim() !== '') {
      await onUpdate({
        id: accountId,
        name: editedName
      });
      setEditingAccountId(null);
      setEditedName('');
    }
  };

  const handleCancel = () => {
    setEditingAccountId(null);
    setEditedName('');
  };

  const handleDelete = async (accountId) => {
    await onDelete(accountId);
  };

  const handleCreate = async () => {
    if (newAccountName.trim() !== '') {
      await onAdd({
        name: newAccountName
      });
      setNewAccountName('');
    }
  };

  return (
    <div className="accounts-manager">
      <h3>Manage Accounts</h3>
      <div className="accounts-list">
        {accounts.map((account) => (
          <div key={account.id} className="account-item">
            {editingAccountId === account.id ? (
              <>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="account-name-input"
                />
                <div className="account-actions">
                  <button onClick={() => handleSave(account.id)} className="account-action-btn">
                    <MdSave />
                  </button>
                  <button onClick={handleCancel} className="account-action-btn">
                    <MdClose />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="account-name">{account.name}</span>
                <div className="account-actions">
                  <button onClick={() => handleEdit(account)} className="account-action-btn">
                    <MdEdit />
                  </button>
                  <button onClick={() => handleDelete(account.id)} className="account-action-btn delete">
                    <MdDelete />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="new-account-section">
        <input
          type="text"
          placeholder="New account name"
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          className="account-name-input"
        />
        <button onClick={handleCreate} className="create-account-btn">
          Add Account
        </button>
      </div>
    </div>
  );
}
