import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:3000/api';
const socket = io('http://localhost:3000/ws');

export function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSessions();

    socket.on('session:qr', ({ sessionId, qr }) => {
      setQrCodes((prev) => ({ ...prev, [sessionId]: qr }));
    });

    socket.on('session:connected', ({ sessionId }) => {
      setQrCodes((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'connected' } : s));
      toast.success('WhatsApp conectado!');
    });

    socket.on('session:disconnected', ({ sessionId }) => {
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'disconnected' } : s));
    });

    return () => { socket.off('session:qr'); socket.off('session:connected'); socket.off('session:disconnected'); };
  }, []);

  const fetchSessions = async () => {
    const { data } = await axios.get(`${API}/whatsapp/sessions`);
    setSessions(data);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { data } = await axios.post(`${API}/whatsapp/sessions`, { name: newName.trim() });
    setSessions((prev) => [...prev, data]);
    setShowModal(false);
    setNewName('');
    toast.success('Sessu00e3o criada!');
  };

  const handleConnect = (sessionId: string) => {
    socket.emit('session:connect', { sessionId });
    toast('Conectando...');
  };

  const handleDisconnect = (sessionId: string) => {
    socket.emit('session:disconnect', { sessionId });
  };

  const handleDelete = async (sessionId: string) => {
    await axios.delete(`${API}/whatsapp/sessions/${sessionId}`);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success('Sessu00e3o removida');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      connected: ['badge-green', 'u25cf Conectado'],
      qr_waiting: ['badge-yellow', 'u25d4 Aguardando QR'],
      connecting: ['badge-yellow', 'u2026 Conectando'],
      disconnected: ['badge-gray', 'u25cb Desconectado'],
    };
    const [cls, label] = map[status] || ['badge-gray', status];
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Sessu00f5es WhatsApp</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nova Sessu00e3o</button>
      </div>

      <div className="grid">
        {sessions.map((s) => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{s.name}</h3>
              {statusBadge(s.status)}
            </div>

            {qrCodes[s.id] && (
              <div style={{ textAlign: 'center', margin: '16px 0' }}>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Escaneie o QR Code no WhatsApp</p>
                <img src={qrCodes[s.id]} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 8 }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {s.status === 'disconnected' && (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleConnect(s.id)}>
                  Conectar
                </button>
              )}
              {(s.status === 'connected' || s.status === 'qr_waiting' || s.status === 'connecting') && (
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleDisconnect(s.id)}>
                  Desconectar
                </button>
              )}
              <button className="btn btn-danger" onClick={() => handleDelete(s.id)}>u2715</button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', color: '#555', marginTop: 80 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>uD83DuDCF1</p>
          <p style={{ fontSize: 18 }}>Nenhuma sessu00e3o ainda</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Conecte seu WhatsApp para comeu00e7ar</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Nova Sessu00e3o WhatsApp</h2>
            <div className="form-group">
              <label>Nome da sessu00e3o</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Ex: Atendimento, Vendas, Suporte"
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
