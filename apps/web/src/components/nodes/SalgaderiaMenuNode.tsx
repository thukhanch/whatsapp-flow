import { BaseNode } from './BaseNode';

export function SalgaderiaMenuNode({ data }: any) {
  return (
    <BaseNode icon="🥟" title={String(data.label || 'Menu Salgaderia')} color="#f59e0b">
      <div style={{ fontSize: 11, color: '#aaa' }}>Cardápio guiado por etapas</div>
      <div style={{ marginTop: 6, fontSize: 11 }}>
        {['início', 'item', 'qtd', 'data', 'hora', 'entrega', 'confirmação'].map(e => (
          <span key={e} style={{
            display: 'inline-block', background: '#2a2a2a',
            borderRadius: 4, padding: '1px 5px', marginRight: 3, marginBottom: 3, color: '#ccc'
          }}>{e}</span>
        ))}
      </div>
    </BaseNode>
  );
}
