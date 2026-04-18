import { BaseNode } from './BaseNode';

export function EvolutionSendNode({ data }: any) {
  return (
    <BaseNode icon="📤" title={String(data.label || 'Enviar via Evolution')} color="#128c7e">
      <div style={{ fontSize: 11, color: '#aaa' }}>Envia resposta pelo WhatsApp</div>
      {data.instance && (
        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
          Instância: {String(data.instance)}
        </div>
      )}
    </BaseNode>
  );
}
