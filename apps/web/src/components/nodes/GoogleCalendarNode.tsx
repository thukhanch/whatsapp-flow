import { BaseNode } from './BaseNode';

export function GoogleCalendarNode({ data }: any) {
  return (
    <BaseNode icon="📅" title={String(data.label || 'Google Agenda')} color="#4285f4">
      <div style={{ fontSize: 11, color: '#aaa' }}>Cria evento ao confirmar pedido</div>
      {data.calendarId && (
        <div style={{ fontSize: 10, color: '#555', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 155 }}>
          📆 {String(data.calendarId)}
        </div>
      )}
    </BaseNode>
  );
}
