import { ImageResponse } from 'next/og';

export const alt = 'Just Tennis US Open tournament preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#061b3f',
          color: '#ffffff',
          padding: '66px 76px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              background: '#35c95a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#061b3f',
              fontSize: 58,
              fontWeight: 700,
            }}
          >
            JT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#ffe04b', fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
              JUST TENNIS
            </div>
            <div style={{ color: '#c8d7f2', fontSize: 28 }}>US Open Edition</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.02 }}>Just Tennis US Open</div>
          <div style={{ width: 760, color: '#dce8ff', fontSize: 34, lineHeight: 1.25 }}>
            Live league tables, match results, and knockout bracket.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9fc0ff', fontSize: 28 }}>
          <span>Group stage</span>
          <span>Quarter-finals · Semi-finals · Final</span>
        </div>
      </div>
    ),
    size,
  );
}
