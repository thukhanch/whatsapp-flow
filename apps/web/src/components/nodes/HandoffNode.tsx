import { BaseNode } from './BaseNode';

export function HandoffNode({ data }: any) {
  return (
    <BaseNode icon="🙋" title={String(data.label || 'Handoff Humano')} color="#ef4444" hasOutput={false}>
      <div style={{ fontSize: 11, color: '#aaa' }}>Transfere para o dono</div>
      {data.donoWhatsapp && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          📱 {String(data.donoWhatsapp)}
        </div>
      )}
    </BaseNode>
  );
}
