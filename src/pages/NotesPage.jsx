import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, X, Search, StickyNote } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIAS = ['General', 'Pendiente', 'Importante', 'Idea']

function getCategoryColor(cat) {
  switch (cat) {
    case 'Pendiente': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Importante': return 'bg-red-50 text-red-700 border-red-200'
    case 'Idea': return 'bg-blue-50 text-blue-700 border-blue-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200' // General
  }
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4 mobile-fullscreen-modal-container">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl relative w-full max-w-lg p-6 animate-fade-in z-10 mobile-fullscreen-modal overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function NoteForm({ initial, onSave, onCancel, loading }) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [contenido, setContenido] = useState(initial?.contenido ?? '')
  const [categoria, setCategoria] = useState(initial?.categoria ?? 'General')

  function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim()) return toast.error('El título es requerido')
    onSave({ titulo: titulo.trim(), contenido: contenido.trim(), categoria })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Título *</label>
        <input className="input-field" placeholder="Ej. Revisar contrato de luces" value={titulo} onChange={e => setTitulo(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="form-label">Categoría *</label>
        <div className="flex gap-2 mt-1">
          {CATEGORIAS.map(c => (
            <button 
              key={c} type="button" 
              onClick={() => setCategoria(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${categoria === c ? getCategoryColor(c) : 'bg-white text-slate-400 border-gray-200 hover:bg-slate-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label">Contenido de la nota</label>
        <textarea className="input-field min-h-[120px] resize-y" placeholder="Escribe los detalles aquí..." value={contenido} onChange={e => setContenido(e.target.value)} />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Nota'}</button>
      </div>
    </form>
  )
}

export default function NotesPage() {
  const { isAdmin } = useAuth()
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Todas')
  const [modalMode, setModalMode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  // Si por alguna razón un visor entra aquí, el componente igual puede bloquear la UI, pero el router debería impedirlo
  if (!isAdmin) return <p className="p-8 text-center text-red-500">Acceso denegado</p>

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('notas').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar notas')
    setNotas(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => notas.filter(n => {
    const matchCat = catFilter === 'Todas' || n.categoria === catFilter
    const matchSearch = n.titulo?.toLowerCase().includes(search.toLowerCase()) || n.contenido?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  }), [notas, search, catFilter])

  async function handleSave(values) {
    setSaving(true)
    const { error } = modalMode === 'create' 
      ? await supabase.from('notas').insert([values]) 
      : await supabase.from('notas').update(values).eq('id', selected.id)
    
    if (error) {
      toast.error(error.message)
    } else { 
      toast.success(modalMode === 'create' ? 'Nota creada' : 'Nota actualizada')
      await load() 
    }
    setSaving(false); setModalMode(null); setSelected(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta nota permanentemente?')) return
    const { error } = await supabase.from('notas').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Nota eliminada')
      setNotas(prev => prev.filter(n => n.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-700">Administración</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notas Rápidas</h1>
          <p className="text-sm mt-1 text-slate-500">Módulo exclusivo para administradores.</p>
        </div>
        <button className="btn-primary" onClick={() => { setSelected(null); setModalMode('create') }}>
          <Plus size={16} /> Nueva Nota
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar en título o contenido..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button onClick={() => setCatFilter('Todas')} className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${catFilter === 'Todas' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}>
            Todas
          </button>
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-colors ${catFilter === c ? getCategoryColor(c) : 'bg-white text-slate-400 border-gray-200 hover:bg-slate-50'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-slate-400 border-dashed border-2 bg-slate-50/50">
          <StickyNote size={32} className="mb-4 opacity-50 text-slate-400" />
          <p className="font-semibold text-slate-700">No hay notas encontradas</p>
          <p className="text-sm text-slate-500 mt-1">{search || catFilter !== 'Todas' ? 'Intenta con otros filtros de búsqueda.' : 'Crea tu primera nota para empezar.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(nota => (
            <div key={nota.id} className="glass-card flex flex-col animate-fade-in group hover:border-slate-300 transition-colors">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryColor(nota.categoria)}`}>
                    {nota.categoria}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-slate-400 hover:text-slate-700 bg-white border border-gray-200 rounded shadow-sm" onClick={() => { setSelected(nota); setModalMode('edit') }}><Pencil size={12} /></button>
                    <button className="p-1 text-red-400 hover:text-red-700 bg-white border border-red-100 rounded shadow-sm hover:bg-red-50" onClick={() => handleDelete(nota.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 leading-tight">{nota.titulo}</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{nota.contenido}</p>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-gray-100 text-[10px] font-medium text-slate-400 uppercase tracking-widest rounded-b-lg">
                {new Date(nota.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && <Modal title={modalMode === 'create' ? 'Nueva Nota' : 'Editar Nota'} onClose={() => { setModalMode(null); setSelected(null) }}><NoteForm initial={selected} loading={saving} onSave={handleSave} onCancel={() => { setModalMode(null); setSelected(null) }} /></Modal>}
    </div>
  )
}
