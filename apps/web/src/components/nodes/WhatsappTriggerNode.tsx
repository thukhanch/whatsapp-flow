import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';

export function WhatsappTriggerNode({ data }: NodeProps) {
  return (
    <BaseNode icon="uD83DuDCE8" title={String(data.label || 'WA Trigger')} color="#25d366" hasInput={false}>
      <div>Mensagem recebida</div>
      {data.filter && <div style={{ color: '#888', marginTop: 4 }}>Filtro: {String(data.filter)}</div>}
    </BaseNode>
  );
}
