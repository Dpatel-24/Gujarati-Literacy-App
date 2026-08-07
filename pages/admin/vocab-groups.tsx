import { useEffect, useState, type FormEvent } from 'react';
import styles from '@/styles/AdminForm.module.css';

interface VocabGroup {
  id: string;
  name: string;
  sort_order: number;
  item_count: number;
}

interface WordItem {
  id: string;
  gujarati_text: string;
  phonetic_text: string;
  meaning: string | null;
}

/**
 * Admin tool for organizing approved vocabulary words into groups
 * (content_units, module 'vocabulary'). Words land here unassigned
 * (unit_id null) after approval in review-vocab.tsx -- this is where
 * they get sorted into chapters, and can be moved between groups or
 * back to unassigned at any time.
 */
export default function VocabGroups() {
  const [groups, setGroups] = useState<VocabGroup[] | null>(null);
  const [unassigned, setUnassigned] = useState<WordItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [pickedGroupByItem, setPickedGroupByItem] = useState<Record<string, string>>({});
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupItems, setGroupItems] = useState<Record<string, WordItem[]>>({});
  const [groupItemsLoading, setGroupItemsLoading] = useState(false);
  const [reassignPickByItem, setReassignPickByItem] = useState<Record<string, string>>({});

  async function loadGroups() {
    try {
      const res = await fetch('/api/vocab-groups');
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? 'Failed to load vocab groups');
        return;
      }
      setGroups(data);
    } catch (err: any) {
      setListError(err.message);
    }
  }

  async function loadUnassigned() {
    try {
      const res = await fetch('/api/content-items/unassigned-words');
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? 'Failed to load unassigned words');
        return;
      }
      setUnassigned(data);
    } catch (err: any) {
      setListError(err.message);
    }
  }

  useEffect(() => {
    loadGroups();
    loadUnassigned();
  }, []);

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/vocab-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? 'Failed to create group');
        return;
      }
      setNewGroupName('');
      await loadGroups();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function assignItem(itemId: string, unitId: string | null) {
    setBusyItemId(itemId);
    setActionError(null);
    try {
      const res = await fetch('/api/content-items/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, unitId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Assign failed');
        return;
      }
      // Refresh everything touched: unassigned list, group counts, and
      // (if a group is expanded) its item list.
      await Promise.all([loadGroups(), loadUnassigned()]);
      if (expandedGroupId) {
        await loadGroupItems(expandedGroupId, true);
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusyItemId(null);
    }
  }

  async function loadGroupItems(groupId: string, force = false) {
    if (!force && groupItems[groupId]) return;
    setGroupItemsLoading(true);
    try {
      const res = await fetch(`/api/vocab-groups/${groupId}/items`);
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Failed to load group items');
        return;
      }
      setGroupItems((prev) => ({ ...prev, [groupId]: data }));
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setGroupItemsLoading(false);
    }
  }

  function toggleGroup(groupId: string) {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    loadGroupItems(groupId);
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Vocabulary Groups</h1>
      <p className={styles.subheading}>
        Sort approved words (unassigned after review) into groups. Groups are chapters learners will see.
      </p>

      {listError && <p className={styles.errorText}>{listError}</p>}
      {actionError && <p className={styles.errorText}>{actionError}</p>}

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Create group</h2>
        <form onSubmit={handleCreateGroup} className={styles.inlineForm}>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            required
            className={styles.input}
          />
          <button type="submit" disabled={creating} className={styles.primaryButton}>
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </form>
        {createError && <p className={styles.errorText}>{createError}</p>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Unassigned words</h2>

        {!unassigned && <p className={styles.subheading}>Loading…</p>}
        {unassigned && unassigned.length === 0 && (
          <p className={styles.emptyText}>No unassigned words right now.</p>
        )}

        {unassigned && unassigned.length > 0 && (
          <div className={styles.candidateList}>
            {unassigned.map((item) => (
              <div key={item.id} className={styles.candidateRow}>
                <div className={styles.candidateMain}>
                  <span className={styles.candidateGujarati}>{item.gujarati_text}</span>
                  <span className={styles.candidatePhonetic}>{item.phonetic_text}</span>
                  <span className={styles.candidateGloss}>{item.meaning ?? '—'}</span>
                </div>
                <div className={styles.candidateActions}>
                  <select
                    value={pickedGroupByItem[item.id] ?? ''}
                    onChange={(e) =>
                      setPickedGroupByItem((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className={styles.select}
                  >
                    <option value="">Choose group…</option>
                    {(groups ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => assignItem(item.id, pickedGroupByItem[item.id] || null)}
                    disabled={busyItemId === item.id || !pickedGroupByItem[item.id]}
                    className={styles.approveButton}
                  >
                    {busyItemId === item.id ? 'Working…' : 'Assign'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Existing groups</h2>

        {!groups && <p className={styles.subheading}>Loading…</p>}
        {groups && groups.length === 0 && <p className={styles.emptyText}>No groups yet.</p>}

        {groups && groups.length > 0 && (
          <div className={styles.groupList}>
            {groups.map((g) => (
              <div key={g.id}>
                <button onClick={() => toggleGroup(g.id)} className={styles.groupRow}>
                  <span className={styles.groupName}>{g.name}</span>
                  <span className={styles.groupCount}>
                    {g.item_count} word{g.item_count === 1 ? '' : 's'}
                  </span>
                </button>

                {expandedGroupId === g.id && (
                  <div className={styles.groupDetail}>
                    {groupItemsLoading && !groupItems[g.id] && (
                      <p className={styles.subheading} style={{ marginBottom: 0 }}>
                        Loading…
                      </p>
                    )}
                    {groupItems[g.id] && groupItems[g.id].length === 0 && (
                      <p className={styles.emptyText}>No words in this group yet.</p>
                    )}
                    {groupItems[g.id] &&
                      groupItems[g.id].map((item) => (
                        <div key={item.id} className={styles.groupItemRow}>
                          <div className={styles.groupItemMain}>
                            <span className={styles.candidateGujarati}>{item.gujarati_text}</span>
                            <span className={styles.candidatePhonetic}>{item.phonetic_text}</span>
                            <span className={styles.candidateGloss}>{item.meaning ?? '—'}</span>
                          </div>
                          <div className={styles.groupItemActions}>
                            <select
                              value={reassignPickByItem[item.id] ?? ''}
                              onChange={(e) =>
                                setReassignPickByItem((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              className={styles.select}
                            >
                              <option value="">Move to…</option>
                              {groups.filter((og) => og.id !== g.id).map((og) => (
                                <option key={og.id} value={og.id}>
                                  {og.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => assignItem(item.id, reassignPickByItem[item.id] || null)}
                              disabled={busyItemId === item.id || !reassignPickByItem[item.id]}
                              className={styles.approveButton}
                            >
                              Move
                            </button>
                            <button
                              onClick={() => assignItem(item.id, null)}
                              disabled={busyItemId === item.id}
                              className={styles.rejectButton}
                            >
                              Unassign
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
