const NODE_TYPES = [
  { type: 'whatsapp-trigger', label: 'WA Trigger', icon: 'uD83DuDCE8', desc: 'Mensagem recebida' },
  { type: 'whatsapp-send', label: 'WA Enviar', icon: 'uD83DuDCE4', desc: 'Enviar mensagem' },
  { type: 'condition', label: 'Condiu00e7u00e3o', icon: 'uD83DuDD00', desc: 'Se / Enu00e3o' },
  { type: 'delay', label: 'Delay', icon: 'u23F1', desc: 'Aguardar X segundos' },
  { type: 'http-request', label: 'HTTP Request', icon: 'uD83CuDF10', desc: 'Chamar API externa' },
];

export function NodeSidebar() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('nodeType', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{
      width: 180,
      background: '#1a1a1a',
      borderRight: '1px solid #2a2a2a',
      padding: '16px 10px',
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      <p style={{ fontSize: 11, color: '#555', fontWeight: 600, letterSpacing: 1, marginBottom: 12, paddingLeft: 4 }}>
        NODES
      </p>
      {NODE_TYPES.map((n) => (
        <div
          key={n.type}
          draggable
          onDragStart={(e) => onDragStart(e, n.type)}
          style={{
            background: '#252525',
            border: '1px solid #333',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 8,
            cursor: 'grab',
            userSelect: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2e2e2e')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#252525')}
        >
          <div style={{ fontSize: 18, marginBottom: 4 }}>{n.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.label}</div>
          <div style={{ fontSize: 11, color: '#666' }}>{n.desc}</div>
        </div>
      ))}
    </div>
  );
}
