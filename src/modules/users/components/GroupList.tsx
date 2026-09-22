import { useState } from 'react'
import {
  useAdmins,
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useRenameGroup,
} from '../hooks/useAdmins'

export function GroupList({ canEdit }: { canEdit: boolean }) {
  const { groups, isLoading, isError } = useGroups()
  const { admins } = useAdmins()
  const create = useCreateGroup()
  const rename = useRenameGroup()
  const remove = useDeleteGroup()

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [confirming, setConfirming] = useState<number | null>(null)

  if (isLoading) return <p className="text-sm text-slate-500">Loading groups…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load groups.</p>

  const memberCount = (id: number) => admins.filter((a) => a.groupId === id).length

  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Groups organise administrators. {groups.length}{' '}
          {groups.length === 1 ? 'group' : 'groups'}.
        </p>
        {canEdit && !adding && (
          <button
            onClick={() => {
              setAdding(true)
              setDraft('')
            }}
            className="rounded bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
          >
            Add
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAdding(false)
            }}
            placeholder="Group name"
            className="min-w-0 flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <button
            disabled={draft.trim().length < 1 || create.isPending}
            onClick={() =>
              create.mutate(draft.trim(), { onSuccess: () => setAdding(false) })
            }
            className="rounded bg-brand-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Confirm
          </button>
          <button onClick={() => setAdding(false)} className="text-xs text-slate-500">
            Cancel
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No groups yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Group name</th>
                <th className="px-4 py-2 font-medium">Creator</th>
                <th className="px-4 py-2 font-medium">Admins</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => (
                <tr key={group.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-400">{index}</td>
                  <td className="px-4 py-2">
                    {editingId === group.id ? (
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{group.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{group.createdBy ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{memberCount(group.id)}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    {!canEdit ? null : editingId === group.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <button
                          disabled={rename.isPending}
                          onClick={() =>
                            rename.mutate(
                              { id: group.id, name: editDraft.trim() },
                              { onSuccess: () => setEditingId(null) }
                            )
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-slate-700"
                        >
                          Confirm
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500">
                          Cancel
                        </button>
                      </span>
                    ) : confirming === group.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="text-slate-600">
                          {/* Deleting a group on the live backend leaves
                              administrators still pointing at its id. */}
                          {memberCount(group.id) > 0
                            ? `${memberCount(group.id)} admin${memberCount(group.id) === 1 ? '' : 's'} will lose their group.`
                            : 'Delete this group?'}
                        </span>
                        <button
                          onClick={() =>
                            remove.mutate(group.id, { onSettled: () => setConfirming(null) })
                          }
                          className="rounded border border-red-300 px-2 py-1 text-red-600"
                        >
                          Confirm
                        </button>
                        <button onClick={() => setConfirming(null)} className="text-slate-500">
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            setEditingId(group.id)
                            setEditDraft(group.name)
                          }}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirming(group.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
