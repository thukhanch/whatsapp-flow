import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../store/workflowStore';
import toast from 'react-hot-toast';

export function WorkflowsPage() {
  const navigate = useNavigate();
  const { workflows, fetchWorkflows, createWorkflow, deleteWorkflow, toggleActive } = useWorkflowStore();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { fetchWorkflows(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const wf = await createWorkflow(newName.trim());
    toast.success('Workflow criado!');
    setShowModal(false);
    setNewName('');
    navigate(`/workflows/${wf.id}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Workflows</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Novo Workflow
        </button>
      </div>

      {workflows.length === 0 && (
        <div style={{ textAlign: 'center', color: '#555', marginTop: 80 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>⚡</p>
          <p style={{ fontSize: 18, marginBottom: 8 }}>Nenhum workflow ainda</p>
          <p style={{ fontSize: 14 }}>Crie seu primeiro workflow de automação</p>
        </div>
      )}

      <div className="grid">
        {workflows.map((wf) => (
          <div key={wf.id} className="card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{wf.name}</h3>
              <span className={`badge ${wf.active ? 'badge-green' : 'badge-gray'}`}>
                {wf.active ? '● Ativo' : '○ Inativo'}
              </span>
            </div>
            <p style={{ color: '#555', fontSize: 13, marginBottom: 16 }}>
              {wf.nodes?.length || 0} node(s) · Atualizado {new Date(wf.updatedAt).toLocaleDateString('pt-BR')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(`/workflows/${wf.id}`)}>
                Editar
              </button>
              <button
                className={`btn ${wf.active ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => { toggleActive(wf.id, !wf.active); toast.success(wf.active ? 'Desativado' : 'Ativado!'); }}
              >
                {wf.active ? 'Pausar' : 'Ativar'}
              </button>
              <button className="btn btn-danger" onClick={() => { deleteWorkflow(wf.id); toast.success('Removido'); }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Novo Workflow</h2>
            <div className="form-group">
              <label>Nome do workflow</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Ex: Responder mensagens automaticamente"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
